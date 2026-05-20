"use strict";
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
exports.enqueueSessionReminders = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const REGION = 'asia-southeast2';
function parseSessionStartMs(raw) {
    const slot = raw.finalSlot ??
        raw.confirmedSlot;
    if (!slot || typeof slot !== 'object')
        return null;
    const date = typeof slot.date === 'string' ? slot.date.trim() : '';
    const time = typeof slot.time === 'string' ? slot.time.trim() : '';
    if (!date)
        return null;
    const combined = `${date}${time ? ` ${time}` : ''}`.trim();
    const parsed = new Date(combined);
    if (!Number.isNaN(parsed.getTime()))
        return parsed.getTime();
    return null;
}
function dueReminderKinds(startMs, nowMs) {
    const minsUntilStart = (startMs - nowMs) / 60000;
    const kinds = [];
    // Tolerant windows so slight scheduler delays still send once.
    if (minsUntilStart >= 55 && minsUntilStart <= 65)
        kinds.push('1h');
    if (minsUntilStart >= 3 && minsUntilStart <= 7)
        kinds.push('5m');
    return kinds;
}
function reminderDocId(sessionId, kind, userId) {
    return `session_reminder_${sessionId}_${kind}_${userId}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 140);
}
function reminderBody(kind, slot) {
    if (kind === '1h') {
        return `Reminder: Your counseling session starts in 1 hour (${slot.date} at ${slot.time || 'scheduled time'}).`;
    }
    return `Reminder: Your counseling session starts in 5 minutes (${slot.date} at ${slot.time || 'scheduled time'}).`;
}
async function isSessionPushEnabled(userId) {
    const snap = await admin.firestore().collection('users').doc(userId).get();
    if (!snap.exists)
        return false;
    return snap.data()?.session_push_notifications_enabled !== false;
}
exports.enqueueSessionReminders = (0, scheduler_1.onSchedule)({
    schedule: 'every 2 minutes',
    region: REGION,
    timeZone: 'Asia/Manila',
}, async () => {
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
        const data = docSnap.data();
        const startMs = parseSessionStartMs(data);
        if (startMs == null)
            continue;
        const kinds = dueReminderKinds(startMs, nowMs);
        if (kinds.length === 0)
            continue;
        const counselorId = typeof data.counselorId === 'string' ? data.counselorId.trim() : '';
        const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
        if (!counselorId || !studentId)
            continue;
        const slot = (data.finalSlot ??
            data.confirmedSlot) || {};
        const slotDate = typeof slot.date === 'string' ? slot.date : '';
        const slotTime = typeof slot.time === 'string' ? slot.time : '';
        if (!slotDate)
            continue;
        const [studentEnabled, counselorEnabled] = await Promise.all([
            isSessionPushEnabled(studentId),
            isSessionPushEnabled(counselorId),
        ]);
        for (const kind of kinds) {
            const targetUsers = [
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
                if (!target.enabled)
                    continue;
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
                }
                catch (e) {
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
});
//# sourceMappingURL=sessionReminderScheduler.js.map