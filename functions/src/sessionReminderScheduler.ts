import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

import { parseSessionSlotToMillisManila } from './sessionSlotAuthority';

type ReminderKind = '1h' | '5m';

const REGION = 'asia-southeast2';

function scheduledStartInstantMs(raw: Record<string, unknown>): number | null {
  const st = raw.scheduledStartAt;
  if (
    st != null &&
    typeof st === 'object' &&
    typeof (st as { toMillis?: () => number }).toMillis === 'function'
  ) {
    const ms = (st as { toMillis: () => number }).toMillis();
    if (typeof ms === 'number' && Number.isFinite(ms)) return ms;
  }
  const slot =
    (raw.finalSlot as Record<string, unknown> | null | undefined) ??
    (raw.confirmedSlot as Record<string, unknown> | null | undefined);
  if (!slot || typeof slot !== 'object') return null;
  const date = typeof slot.date === 'string' ? slot.date.trim() : '';
  const time = typeof slot.time === 'string' ? slot.time.trim() : '';
  if (!date) return null;
  return parseSessionSlotToMillisManila({ date, time });
}

function dueReminderKinds(startMs: number, nowMs: number): ReminderKind[] {
  const minsUntilStart = (startMs - nowMs) / 60000;
  const kinds: ReminderKind[] = [];
  // Tolerant windows so slight scheduler delays still send once.
  if (minsUntilStart >= 55 && minsUntilStart <= 65) kinds.push('1h');
  if (minsUntilStart >= 3 && minsUntilStart <= 7) kinds.push('5m');
  return kinds;
}

function reminderDocId(sessionId: string, kind: ReminderKind, userId: string): string {
  return `session_reminder_${sessionId}_${kind}_${userId}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 140);
}

function reminderBody(kind: ReminderKind, slot: { date: string; time: string }): string {
  if (kind === '1h') {
    return `Reminder: Your counseling session starts in 1 hour (${slot.date} at ${slot.time || 'scheduled time'}).`;
  }
  return `Reminder: Your counseling session starts in 5 minutes (${slot.date} at ${slot.time || 'scheduled time'}).`;
}

async function isSessionPushEnabled(userId: string): Promise<boolean> {
  const snap = await admin.firestore().collection('users').doc(userId).get();
  if (!snap.exists) return false;
  return snap.data()?.session_push_notifications_enabled !== false;
}

export const enqueueSessionReminders = onSchedule(
  {
    schedule: 'every 2 minutes',
    region: REGION,
    timeZone: 'Asia/Manila',
  },
  async () => {
    const db = admin.firestore();
    const nowMs = Date.now();

    const sessionsSnap = await db
      .collection('sessions')
      .where('status', '==', 'confirmed')
      .get();

    let createdCount = 0;
    let scanned = 0;

    for (const docSnap of sessionsSnap.docs) {
      scanned += 1;
      const data = docSnap.data() as Record<string, unknown>;
      const startMs = scheduledStartInstantMs(data);
      if (startMs == null) continue;
      const kinds = dueReminderKinds(startMs, nowMs);
      if (kinds.length === 0) continue;

      const counselorId =
        typeof data.counselorId === 'string' ? data.counselorId.trim() : '';
      const studentId =
        typeof data.studentId === 'string' ? data.studentId.trim() : '';
      if (!counselorId || !studentId) continue;

      const slot =
        ((data.finalSlot as Record<string, unknown> | undefined) ??
          (data.confirmedSlot as Record<string, unknown> | undefined)) || {};
      const slotDate = typeof slot.date === 'string' ? slot.date : '';
      const slotTime = typeof slot.time === 'string' ? slot.time : '';
      if (!slotDate) continue;

      const [studentEnabled, counselorEnabled] = await Promise.all([
        isSessionPushEnabled(studentId),
        isSessionPushEnabled(counselorId),
      ]);

      for (const kind of kinds) {
        const targetUsers: Array<{
          userId: string;
          enabled: boolean;
          targetRoute: '/(student)/messages' | '/(counselor)/messages';
        }> = [
          {
            userId: studentId,
            enabled: studentEnabled,
            targetRoute: '/(student)/messages',
          },
          {
            userId: counselorId,
            enabled: counselorEnabled,
            targetRoute: '/(counselor)/messages',
          },
        ];

        for (const target of targetUsers) {
          if (!target.enabled) continue;
          const notifRef = db
            .collection('notifications')
            .doc(reminderDocId(docSnap.id, kind, target.userId));

          try {
            await notifRef.create({
              user_id: target.userId,
              type: 'counselor_message',
              message: reminderBody(kind, { date: slotDate, time: slotTime }),
              status: 'pending',
              delivery_mode: 'local_bridge',
              notification_key: `session:${docSnap.id}:reminder_${kind}:${target.userId}`,
              target_route: target.targetRoute,
              scheduled_for: admin.firestore.FieldValue.serverTimestamp(),
              created_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            createdCount += 1;
          } catch (e) {
            // Already exists or transient issue; skip quietly to keep scheduler stable.
            const msg = String(e);
            if (!/already exists/i.test(msg)) {
              logger.warn('enqueueSessionReminders: notification create skipped', {
                sessionId: docSnap.id,
                userId: target.userId,
                kind,
                err: msg,
              });
            }
          }
        }
      }
    }

    logger.info('enqueueSessionReminders completed', {
      scannedSessions: scanned,
      notificationsCreated: createdCount,
    });
  },
);

