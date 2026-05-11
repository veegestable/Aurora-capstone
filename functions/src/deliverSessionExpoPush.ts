/**
 * Firestore trigger: when a session-related notification row is created, send an Expo push
 * so devices receive it while the app is closed. Reads tokens from users/{uid}/private/push.
 *
 * Env (optional): EXPO_ACCESS_TOKEN — Expo push access token for higher reliability / rate limits.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  channelId: string;
  data: Record<string, string>;
};

function normalizeTargetRoute(raw: unknown): '/(student)/messages' | '/(counselor)/messages' {
  return raw === '/(counselor)/messages' ? '/(counselor)/messages' : '/(student)/messages';
}

async function sendExpoBatch(messages: ExpoPushMessage[]): Promise<{ ok: boolean; status: number }> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  return { ok: res.ok, status: res.status };
}

/**
 * Same region as Firestore/Eventarc trigger (see Firebase Console → Firestore → database location).
 * If deploy fails with Eventarc errors, wait a few minutes after first enabling APIs and redeploy.
 */
export const deliverSessionExpoPush = onDocumentCreated(
  {
    document: 'notifications/{notifId}',
    region: 'asia-southeast2',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const notifId = event.params.notifId;

    if (data.type !== 'counselor_message') return;
    if (data.status !== 'pending') return;

    const userId = typeof data.user_id === 'string' ? data.user_id : '';
    if (!userId) return;

    const dbFs = admin.firestore();
    const userRef = dbFs.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      logger.warn('deliverSessionExpoPush: user missing', { userId, notifId });
      return;
    }

    const userData = userSnap.data()!;
    if (userData.session_push_notifications_enabled === false) {
      await snap.ref.update({
        status: 'sent',
        skipped_by_user_preference: true,
        delivery_mode: 'expo_skipped_preference',
        attempted_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const pushSnap = await userRef.collection('private').doc('push').get();
    const rawTokens = pushSnap.exists ? (pushSnap.data()?.expo_push_tokens as unknown[]) : [];
    const tokens: string[] = [];
    if (Array.isArray(rawTokens)) {
      for (const row of rawTokens) {
        const t =
          row && typeof row === 'object' && typeof (row as { token?: unknown }).token === 'string'
            ? (row as { token: string }).token.trim()
            : '';
        if (t.startsWith('ExponentPushToken')) tokens.push(t);
      }
    }

    // No registered devices — leave doc pending so mobile SessionNotificationBridge can show local.
    if (tokens.length === 0) {
      return;
    }

    const body =
      typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : 'You have a session update.';
    const targetRoute = normalizeTargetRoute(data.target_route);

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: 'Session update',
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'daily-reminders',
      data: {
        type: 'session_update',
        notificationId: notifId,
        target_route: targetRoute,
      },
    }));

    try {
      const { ok, status } = await sendExpoBatch(messages);
      if (!ok) {
        logger.error('deliverSessionExpoPush: Expo HTTP error', { notifId, status });
        return;
      }

      await snap.ref.update({
        status: 'sent',
        delivery_mode: 'expo_push',
        attempted_at: admin.firestore.FieldValue.serverTimestamp(),
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.error('deliverSessionExpoPush: send failed', { notifId, err: String(e) });
    }
  },
);
