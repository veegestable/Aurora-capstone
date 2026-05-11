"use strict";
/**
 * Firestore trigger: when a session-related notification row is created, send an Expo push
 * so devices receive it while the app is closed. Reads tokens from users/{uid}/private/push.
 *
 * Env (optional): EXPO_ACCESS_TOKEN — Expo push access token for higher reliability / rate limits.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverSessionExpoPush = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
function normalizeTargetRoute(raw) {
    return raw === '/(counselor)/messages' ? '/(counselor)/messages' : '/(student)/messages';
}
async function sendExpoBatch(messages) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    const headers = {
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
exports.deliverSessionExpoPush = (0, firestore_1.onDocumentCreated)({
    document: 'notifications/{notifId}',
    region: 'asia-southeast2',
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const notifId = event.params.notifId;
    if (data.type !== 'counselor_message')
        return;
    if (data.status !== 'pending')
        return;
    const userId = typeof data.user_id === 'string' ? data.user_id : '';
    if (!userId)
        return;
    const dbFs = admin.firestore();
    const userRef = dbFs.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        logger.warn('deliverSessionExpoPush: user missing', { userId, notifId });
        return;
    }
    const userData = userSnap.data();
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
    const rawTokens = pushSnap.exists ? pushSnap.data()?.expo_push_tokens : [];
    const tokens = [];
    if (Array.isArray(rawTokens)) {
        for (const row of rawTokens) {
            const t = row && typeof row === 'object' && typeof row.token === 'string'
                ? row.token.trim()
                : '';
            if (t.startsWith('ExponentPushToken'))
                tokens.push(t);
        }
    }
    // No registered devices — leave doc pending so mobile SessionNotificationBridge can show local.
    if (tokens.length === 0) {
        return;
    }
    const body = typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : 'You have a session update.';
    const targetRoute = normalizeTargetRoute(data.target_route);
    const messages = tokens.map((to) => ({
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
    }
    catch (e) {
        logger.error('deliverSessionExpoPush: send failed', { notifId, err: String(e) });
    }
});
//# sourceMappingURL=deliverSessionExpoPush.js.map