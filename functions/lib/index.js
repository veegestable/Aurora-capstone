"use strict";
/**
 * One-time migration: legacy flat `mood_logs` → `moodLogs/{userId}/entries/{docId}_legacy`.
 *
 * If you previously stored one doc per day under `moodLogs/{userId}/…` (non-`entries` subcollections),
 * add a targeted pass for that layout before running against production.
 *
 * Deploy: `npm run deploy` from `functions/` (Firebase CLI). Callable: `migrateOldMoodLogs` (admin claim).
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
exports.migrateOldMoodLogs = exports.grantCounselorJournalAccessTrusted = exports.createSessionNotificationTrusted = exports.updateSessionRequestTrusted = exports.createCounselorSessionInviteTrusted = exports.sendSessionRequestTrusted = exports.sendTextMessageTrusted = exports.signUpTrusted = exports.resendRegistrationVerificationTrusted = exports.writeAuditLogTrusted = exports.cleanupUnverifiedAuthUsers = exports.generateWeeklyAnalyticsAi = exports.getStudentCounselingOutcomeCountsTrusted = exports.enqueueSessionReminders = exports.deliverSessionExpoPush = exports.generateWeeklySummaryAi = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const resendVerification_1 = require("./resendVerification");
const signUpTrusted_1 = require("./signUpTrusted");
const ensureConversationAdmin_1 = require("./ensureConversationAdmin");
const studentCounselingOutcomeCounts_1 = require("./studentCounselingOutcomeCounts");
const conversationMessagingPolicy_1 = require("./conversationMessagingPolicy");
const sessionSlotAuthority_1 = require("./sessionSlotAuthority");
admin.initializeApp();
const db = admin.firestore();
function pad2(n) {
    return String(n).padStart(2, '0');
}
/** Calendar YYYY-MM-DD in UTC (migration default when user timezone unknown). */
function dayKeyUtc(d) {
    const date = d instanceof Date ? d : d.toDate();
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function emotionColor(name) {
    const n = (name || '').toLowerCase();
    const map = {
        joy: '#FBBF24',
        happiness: '#FBBF24',
        happy: '#FBBF24',
        surprise: '#F97316',
        anger: '#EF4444',
        angry: '#EF4444',
        sadness: '#3B82F6',
        sad: '#3B82F6',
        neutral: '#9CA3AF',
    };
    return map[n] || '#888888';
}
function buildTemplateWeeklySummary(data) {
    if (data.totalEntries === 0)
        return 'No check-ins were recorded in this window.';
    const parts = [];
    parts.push(`You logged ${data.totalEntries} check-in${data.totalEntries === 1 ? '' : 's'} ${data.weekLabel}.`);
    parts.push(`Average intensity was about ${data.averageIntensity.toFixed(1)} (1–10), and the mood that appeared most often was ${data.mostFrequentMood}.`);
    if (data.bestDay !== '—' && data.hardestDay !== '—' && data.bestDay !== data.hardestDay) {
        parts.push(`You tended to rate highest on ${data.bestDay} and most strained on ${data.hardestDay}.`);
    }
    if (data.hadExamsOrDeadlines) {
        parts.push('At least one day included exams or deadlines in your workload context.');
    }
    return parts.join(' ');
}
exports.generateWeeklySummaryAi = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    const data = (request.data ?? {});
    const normalized = {
        weekLabel: typeof data.weekLabel === 'string' ? data.weekLabel : 'this week',
        dominantMood: typeof data.dominantMood === 'string' ? data.dominantMood : '—',
        averageIntensity: typeof data.averageIntensity === 'number' ? data.averageIntensity : 0,
        mostFrequentMood: typeof data.mostFrequentMood === 'string' ? data.mostFrequentMood : '—',
        bestDay: typeof data.bestDay === 'string' ? data.bestDay : '—',
        hardestDay: typeof data.hardestDay === 'string' ? data.hardestDay : '—',
        totalEntries: typeof data.totalEntries === 'number' ? data.totalEntries : 0,
        hadExamsOrDeadlines: !!data.hadExamsOrDeadlines,
        dailyBreakdown: Array.isArray(data.dailyBreakdown)
            ? data.dailyBreakdown.map((x) => ({
                day: typeof x?.day === 'string' ? x.day : '—',
                dominantMood: typeof x?.dominantMood === 'string' ? x.dominantMood : '—',
                avgIntensity: typeof x?.avgIntensity === 'number' ? x.avgIntensity : 0,
                entryCount: typeof x?.entryCount === 'number' ? x.entryCount : 0,
            }))
            : [],
    };
    const fallback = buildTemplateWeeklySummary(normalized);
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
    if (!openrouterKey) {
        return { summary: fallback, fromAi: false };
    }
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openrouterKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: "You are Aurora, a warm academic mood assistant. Write a 2-3 sentence weekly summary for a student based on structured mood data. Tone: supportive, non-clinical. Use 'you'. No bullet points. Don't mention the app.",
                    },
                    { role: 'user', content: JSON.stringify(normalized) },
                ],
                temperature: 0.6,
            }),
        });
        if (!res.ok) {
            return { summary: fallback, fromAi: false };
        }
        const json = (await res.json());
        const text = json.choices?.[0]?.message?.content?.trim();
        if (!text) {
            return { summary: fallback, fromAi: false };
        }
        return { summary: text, fromAi: true };
    }
    catch {
        return { summary: fallback, fromAi: false };
    }
});
var deliverSessionExpoPush_1 = require("./deliverSessionExpoPush");
Object.defineProperty(exports, "deliverSessionExpoPush", { enumerable: true, get: function () { return deliverSessionExpoPush_1.deliverSessionExpoPush; } });
var sessionReminderScheduler_1 = require("./sessionReminderScheduler");
Object.defineProperty(exports, "enqueueSessionReminders", { enumerable: true, get: function () { return sessionReminderScheduler_1.enqueueSessionReminders; } });
exports.getStudentCounselingOutcomeCountsTrusted = (0, studentCounselingOutcomeCounts_1.createGetStudentCounselingOutcomeCountsTrusted)(db);
var weeklyAnalyticsAi_1 = require("./weeklyAnalyticsAi");
Object.defineProperty(exports, "generateWeeklyAnalyticsAi", { enumerable: true, get: function () { return weeklyAnalyticsAi_1.generateWeeklyAnalyticsAi; } });
var cleanupUnverifiedAuthUsers_1 = require("./cleanupUnverifiedAuthUsers");
Object.defineProperty(exports, "cleanupUnverifiedAuthUsers", { enumerable: true, get: function () { return cleanupUnverifiedAuthUsers_1.cleanupUnverifiedAuthUsers; } });
async function getRoleForUid(uid) {
    const snap = await db.collection('users').doc(uid).get();
    const role = snap.data()?.role;
    return typeof role === 'string' ? role : 'unknown';
}
exports.writeAuditLogTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const data = (request.data ?? {});
    const action = typeof data.action === 'string' ? data.action.trim() : '';
    const targetType = typeof data.targetType === 'string' ? data.targetType.trim() : '';
    const targetId = typeof data.targetId === 'string' ? data.targetId.trim() : '';
    if (!action || !targetType || !targetId) {
        throw new https_1.HttpsError('invalid-argument', 'action, targetType, and targetId are required.');
    }
    const performedByRole = await getRoleForUid(uid);
    await db.collection('audit_logs').add({
        performedBy: uid,
        performedByRole,
        action,
        targetType,
        targetId,
        metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
async function hasConversationBetween(counselorId, studentId) {
    const convId = `${counselorId}_${studentId}`;
    const conv = await db.collection('conversations').doc(convId).get();
    if (!conv.exists)
        return false;
    const d = conv.data() ?? {};
    return d.counselorId === counselorId && d.studentId === studentId;
}
async function enforceRateLimit(kind, key, windowMs, maxCount) {
    const nowMs = Date.now();
    const docId = `${kind}:${key}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
    const ref = db.collection('_rateLimits').doc(docId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = snap.data();
        const prevStart = typeof prev?.windowStartMs === 'number' ? prev.windowStartMs : 0;
        const prevCount = typeof prev?.count === 'number' ? prev.count : 0;
        const inWindow = nowMs - prevStart < windowMs;
        const nextStart = inWindow ? prevStart : nowMs;
        const nextCount = inWindow ? prevCount + 1 : 1;
        if (inWindow && prevCount >= maxCount) {
            const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - prevStart)) / 1000));
            throw new https_1.HttpsError('resource-exhausted', `Too many requests. Please wait ${retryAfterSeconds}s and try again.`, { retryAfterSeconds });
        }
        tx.set(ref, {
            kind,
            key,
            count: nextCount,
            windowStartMs: nextStart,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}
exports.resendRegistrationVerificationTrusted = (0, resendVerification_1.createResendRegistrationVerificationTrusted)(enforceRateLimit);
exports.signUpTrusted = (0, signUpTrusted_1.createSignUpTrusted)(enforceRateLimit);
exports.sendTextMessageTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const data = (request.data ?? {});
    const conversationId = typeof data.conversationId === 'string' ? data.conversationId.trim() : '';
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!conversationId || !text) {
        throw new https_1.HttpsError('invalid-argument', 'conversationId and text are required.');
    }
    if (text.length > 2000) {
        throw new https_1.HttpsError('invalid-argument', 'Message is too long.');
    }
    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists)
        throw new https_1.HttpsError('not-found', 'Conversation not found.');
    const conv = convSnap.data() ?? {};
    const isCounselor = conv.counselorId === uid;
    const isStudent = conv.studentId === uid;
    if (!isCounselor && !isStudent) {
        throw new https_1.HttpsError('permission-denied', 'Not a conversation participant.');
    }
    await (0, conversationMessagingPolicy_1.assertConversationMessagingOpen)(db, conversationId, uid);
    await enforceRateLimit('msg', `${uid}:${conversationId}`, 10000, 5);
    const msgRef = await convRef.collection('messages').add({
        senderId: uid,
        content: text,
        type: 'chat',
        sessionId: null,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await convRef.update({
        lastMessage: text.length > 80 ? text.slice(0, 80) + '...' : text,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSenderId: uid,
        ...(isCounselor
            ? { unreadCountStudent: admin.firestore.FieldValue.increment(1) }
            : { unreadCountCounselor: admin.firestore.FieldValue.increment(1) }),
    });
    return { ok: true, messageId: msgRef.id };
});
exports.sendSessionRequestTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const data = (request.data ?? {});
    const preferredTime = typeof data.preferredTime === 'string' ? data.preferredTime.trim() : '';
    const note = typeof data.note === 'string' ? data.note.trim() : '';
    const counselorIdParam = typeof data.counselorId === 'string' ? data.counselorId.trim() : '';
    let conversationId = typeof data.conversationId === 'string' ? data.conversationId.trim() : '';
    if (!preferredTime) {
        throw new https_1.HttpsError('invalid-argument', 'preferredTime is required.');
    }
    let counselorId = counselorIdParam;
    if (!conversationId && counselorId) {
        conversationId = `${counselorId}_${uid}`;
    }
    if (!conversationId) {
        throw new https_1.HttpsError('invalid-argument', 'conversationId or counselorId is required.');
    }
    if (!counselorId) {
        const underscore = conversationId.indexOf('_');
        if (underscore <= 0) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid conversation id.');
        }
        counselorId = conversationId.slice(0, underscore);
        const parsedStudentId = conversationId.slice(underscore + 1);
        if (parsedStudentId !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Only the student can send a session request in this thread.');
        }
    }
    if (conversationId !== `${counselorId}_${uid}`) {
        throw new https_1.HttpsError('permission-denied', 'Only the student can send a session request in this thread.');
    }
    await (0, ensureConversationAdmin_1.ensureConversationDocument)({
        counselorId,
        studentId: uid,
        studentName: typeof data.studentName === 'string' ? data.studentName : undefined,
        studentAvatar: typeof data.studentAvatar === 'string' ? data.studentAvatar : undefined,
        counselorName: typeof data.counselorName === 'string' ? data.counselorName : undefined,
        counselorAvatar: typeof data.counselorAvatar === 'string' ? data.counselorAvatar : undefined,
    });
    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'Conversation could not be created.');
    }
    const conv = convSnap.data() ?? {};
    const studentId = typeof conv.studentId === 'string' ? conv.studentId : '';
    if (studentId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the student can send a session request in this thread.');
    }
    await (0, conversationMessagingPolicy_1.assertConversationMessagingOpen)(db, conversationId, uid);
    await enforceRateLimit('session_request', `${studentId}:${counselorId}`, 30000, 1);
    const preferredMillis = (0, sessionSlotAuthority_1.parsePreferredTimeStringManila)(preferredTime);
    if (preferredMillis == null) {
        throw new https_1.HttpsError('invalid-argument', 'Could not read the requested date and time. Please choose a valid schedule in the picker.');
    }
    const serverNow = Date.now();
    if (!(0, sessionSlotAuthority_1.isSessionStartInFutureManila)(preferredMillis, serverNow)) {
        throw new https_1.HttpsError('failed-precondition', 'Session requests must be for a future date and time (Philippine Time).');
    }
    const convCollege = typeof conv.college_code === 'string' ? conv.college_code.trim() : '';
    const collegeCode = convCollege ||
        (await (0, ensureConversationAdmin_1.resolveConversationCollegeCode)(db, counselorId, studentId));
    const sessionRef = await db.collection('sessions').add({
        counselorId,
        studentId,
        ...(collegeCode ? { college_code: collegeCode } : {}),
        riskFlagId: null,
        initiatedBy: 'student',
        studentRequestNote: note,
        proposedSlots: [],
        confirmedSlot: null,
        finalSlot: null,
        status: 'requested',
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
        sessionHistoryBadge: 'pending',
        preferredTimeFromStudent: preferredTime,
        schedulingTimezone: sessionSlotAuthority_1.SESSION_SCHEDULING_TIMEZONE,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const msgRef = await convRef.collection('messages').add({
        senderId: studentId,
        content: `Session request: ${preferredTime}`,
        type: 'session_request',
        sessionId: sessionRef.id,
        sessionData: {
            sessionId: sessionRef.id,
            note,
            status: 'requested',
            preferredTime,
        },
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await convRef.update({
        lastMessage: `Session request: ${preferredTime}`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSenderId: studentId,
        unreadCountCounselor: admin.firestore.FieldValue.increment(1),
    });
    await db.collection('notifications').add({
        user_id: counselorId,
        type: 'counselor_message',
        message: `A student requested a counseling session for ${preferredTime}.`,
        status: 'pending',
        delivery_mode: 'local_bridge',
        notification_key: `session:${sessionRef.id}:student_request_created`,
        target_route: '/(counselor)/messages',
        scheduled_for: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, messageId: msgRef.id, sessionId: sessionRef.id };
});
exports.createCounselorSessionInviteTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const role = await getRoleForUid(uid);
    if (role !== 'counselor') {
        throw new https_1.HttpsError('permission-denied', 'Only counselors can create session invites.');
    }
    const data = (request.data ?? {});
    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const rawSlots = Array.isArray(data.proposedSlots) ? data.proposedSlots : [];
    const proposedSlots = rawSlots
        .map((x) => ({
        date: typeof x?.date === 'string' ? x.date.trim() : '',
        time: typeof x?.time === 'string' ? x.time.trim() : '',
    }))
        .filter((x) => !!x.date && !!x.time);
    const note = typeof data.note === 'string' ? data.note.trim() : '';
    if (!studentId) {
        throw new https_1.HttpsError('invalid-argument', 'studentId is required.');
    }
    if (proposedSlots.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Provide at least one valid proposed slot.');
    }
    const nowMs = Date.now();
    for (const slot of proposedSlots) {
        const slotMs = (0, sessionSlotAuthority_1.parseSessionSlotToMillisManila)(slot);
        if (slotMs == null) {
            throw new https_1.HttpsError('invalid-argument', 'One or more proposed slots are invalid. Please pick date/time from the picker.');
        }
        if (!(0, sessionSlotAuthority_1.isSessionStartInFutureManila)(slotMs, nowMs)) {
            throw new https_1.HttpsError('failed-precondition', 'All proposed slots must be in the future (Philippine Time).');
        }
    }
    await enforceRateLimit('session_invite', `${uid}:${studentId}`, 30000, 3);
    await (0, conversationMessagingPolicy_1.assertConversationMessagingOpen)(db, `${uid}_${studentId}`, uid);
    const convRef = db.collection('conversations').doc(`${uid}_${studentId}`);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Conversation not found.');
    }
    const conv = convSnap.data() ?? {};
    if (conv.counselorId !== uid || conv.studentId !== studentId) {
        throw new https_1.HttpsError('permission-denied', 'Conversation participants do not match this invite.');
    }
    const convCollege = typeof conv.college_code === 'string' ? conv.college_code.trim() : '';
    const collegeCode = convCollege || (await (0, ensureConversationAdmin_1.resolveConversationCollegeCode)(db, uid, studentId));
    const sessionRef = await db.collection('sessions').add({
        counselorId: uid,
        studentId,
        ...(collegeCode ? { college_code: collegeCode } : {}),
        riskFlagId: null,
        initiatedBy: 'counselor',
        studentRequestNote: note,
        proposedSlots,
        confirmedSlot: null,
        finalSlot: null,
        status: 'pending',
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
        sessionHistoryBadge: 'pending',
        schedulingTimezone: sessionSlotAuthority_1.SESSION_SCHEDULING_TIMEZONE,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('notifications').add({
        user_id: studentId,
        type: 'counselor_message',
        message: 'Your counselor sent a session invitation. Open Messages to review and confirm your preferred slot.',
        status: 'pending',
        delivery_mode: 'local_bridge',
        notification_key: `session:${sessionRef.id}:counselor_invite_created`,
        target_route: '/(student)/messages',
        scheduled_for: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, sessionId: sessionRef.id };
});
exports.updateSessionRequestTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const data = (request.data ?? {});
    const conversationId = typeof data.conversationId === 'string' ? data.conversationId.trim() : '';
    const messageId = typeof data.messageId === 'string' ? data.messageId.trim() : '';
    const sessionId = typeof data.sessionId === 'string' ? data.sessionId.trim() : '';
    const preferredTime = typeof data.preferredTime === 'string' ? data.preferredTime.trim() : '';
    const note = typeof data.note === 'string' ? data.note.trim() : '';
    if (!conversationId || !messageId || !sessionId || !preferredTime) {
        throw new https_1.HttpsError('invalid-argument', 'conversationId, messageId, sessionId, and preferredTime are required.');
    }
    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Conversation not found.');
    }
    const conv = convSnap.data() ?? {};
    const studentId = typeof conv.studentId === 'string' ? conv.studentId : '';
    if (studentId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the student can update this session request.');
    }
    await (0, conversationMessagingPolicy_1.assertConversationMessagingOpen)(db, conversationId, uid);
    const preferredMillis = (0, sessionSlotAuthority_1.parsePreferredTimeStringManila)(preferredTime);
    if (preferredMillis == null) {
        throw new https_1.HttpsError('invalid-argument', 'Could not read the requested date and time. Please choose a valid schedule in the picker.');
    }
    if (!(0, sessionSlotAuthority_1.isSessionStartInFutureManila)(preferredMillis, Date.now())) {
        throw new https_1.HttpsError('failed-precondition', 'Session requests must be for a future date and time (Philippine Time).');
    }
    await enforceRateLimit('session_request_update', `${uid}:${conversationId}:${sessionId}`, 15000, 4);
    const sessRef = db.collection('sessions').doc(sessionId);
    const sessSnap = await sessRef.get();
    if (!sessSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Session not found.');
    }
    const sess = sessSnap.data() ?? {};
    const sessionStudent = typeof sess.studentId === 'string' ? sess.studentId.trim() : '';
    if (sessionStudent && sessionStudent !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Not your session request.');
    }
    const st = typeof sess.status === 'string' ? sess.status : '';
    if (st !== 'requested') {
        throw new https_1.HttpsError('failed-precondition', 'Only an open session request can be edited.');
    }
    const msgRef = convRef.collection('messages').doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Message not found.');
    }
    const msg = msgSnap.data() ?? {};
    if (msg.type !== 'session_request') {
        throw new https_1.HttpsError('invalid-argument', 'Not a session request message.');
    }
    const sd = (msg.sessionData ?? {});
    const linkedSid = typeof msg.sessionId === 'string'
        ? msg.sessionId.trim()
        : typeof sd.sessionId === 'string'
            ? sd.sessionId.trim()
            : '';
    if (linkedSid !== sessionId) {
        throw new https_1.HttpsError('permission-denied', 'This message does not match the session being updated.');
    }
    const content = `Session request: ${preferredTime}`;
    const existingSessionData = sd;
    const batch = db.batch();
    batch.update(sessRef, {
        preferredTimeFromStudent: preferredTime,
        studentRequestNote: note,
        status: 'requested',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(msgRef, {
        content,
        sessionData: {
            ...existingSessionData,
            sessionId,
            note,
            status: 'requested',
            preferredTime,
        },
    });
    batch.update(convRef, {
        lastMessage: content,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSenderId: uid,
    });
    await batch.commit();
    return { ok: true };
});
exports.createSessionNotificationTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const role = await getRoleForUid(uid);
    const data = (request.data ?? {});
    const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    const targetRoute = data.targetRoute === '/(counselor)/messages'
        ? '/(counselor)/messages'
        : '/(student)/messages';
    if (!userId || !message) {
        throw new https_1.HttpsError('invalid-argument', 'userId and message are required.');
    }
    const isSelf = userId === uid;
    const isAdmin = role === 'admin';
    let relationshipAllowed = false;
    if (role === 'student') {
        relationshipAllowed = await hasConversationBetween(userId, uid);
    }
    else if (role === 'counselor') {
        relationshipAllowed = await hasConversationBetween(uid, userId);
    }
    if (!isSelf && !isAdmin && !relationshipAllowed) {
        throw new https_1.HttpsError('permission-denied', 'No conversation relationship for notification recipient.');
    }
    const key = ((typeof data.eventKey === 'string' ? data.eventKey.trim() : '') ||
        message.slice(0, 80).toLowerCase()).toLowerCase();
    await db.collection('notifications').add({
        user_id: userId,
        type: 'counselor_message',
        message,
        status: 'pending',
        delivery_mode: 'local_bridge',
        notification_key: key,
        target_route: targetRoute,
        scheduled_for: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.grantCounselorJournalAccessTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const role = await getRoleForUid(uid);
    if (role !== 'student' && role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only students or admins can grant counselor access.');
    }
    const data = (request.data ?? {});
    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const counselorId = typeof data.counselorId === 'string' ? data.counselorId.trim() : '';
    if (!studentId || !counselorId) {
        throw new https_1.HttpsError('invalid-argument', 'studentId and counselorId are required.');
    }
    if (role !== 'admin' && uid !== studentId) {
        throw new https_1.HttpsError('permission-denied', 'Cannot grant for another student.');
    }
    const counselorSnap = await db.collection('users').doc(counselorId).get();
    if (!counselorSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Counselor not found.');
    }
    const counselor = counselorSnap.data() ?? {};
    if (!(counselor.role === 'counselor' ||
        counselor.role === 'Counselor')) {
        throw new https_1.HttpsError('failed-precondition', 'Target user is not counselor.');
    }
    // Relationship check: existing conversation or session between this student and counselor.
    const hasConversation = await hasConversationBetween(counselorId, studentId);
    let hasSession = false;
    if (!hasConversation) {
        const sessionQ = await db
            .collection('sessions')
            .where('studentId', '==', studentId)
            .where('counselorId', '==', counselorId)
            .limit(1)
            .get();
        hasSession = !sessionQ.empty;
    }
    if (!hasConversation && !hasSession) {
        throw new https_1.HttpsError('permission-denied', 'No session/conversation relationship found.');
    }
    await db
        .collection('userSettings')
        .doc(studentId)
        .set({
        counselorJournalAccess: {
            [counselorId]: true,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
});
exports.migrateOldMoodLogs = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    // Restrict to the caller or elevate via custom claims in production.
    const allow = request.auth.token.admin === true || request.auth.token.migrateMood === true;
    if (!allow) {
        throw new https_1.HttpsError('permission-denied', 'Admin or migrateMood claim required.');
    }
    let moved = 0;
    let deleted = 0;
    // 1) Flat collection mood_logs (current Aurora mobile schema)
    const flat = await db.collection('mood_logs').get();
    for (const doc of flat.docs) {
        const d = doc.data();
        const uid = d.user_id;
        if (!uid)
            continue;
        const logTs = d.log_date;
        if (!logTs)
            continue;
        const emotions = Array.isArray(d.emotions) ? d.emotions : [];
        const primary = emotions[0] || { emotion: 'neutral', confidence: 0.5, color: '#888888' };
        const mood = String(primary.emotion || 'neutral');
        const conf = typeof primary.confidence === 'number' ? primary.confidence : 0.5;
        const intensity = Math.max(1, Math.min(10, Math.round(conf * 10)));
        const stress = Math.max(1, Math.min(5, Math.round(Number(d.stress_level ?? 5) / 2)));
        const energy = Math.max(1, Math.min(5, Math.round(Number(d.energy_level ?? 5) / 2)));
        const color = String(primary.color || emotionColor(mood));
        const dayKey = dayKeyUtc(logTs);
        const entryId = `${doc.id}_legacy`;
        const entryRef = db.collection('moodLogs').doc(uid).collection('entries').doc(entryId);
        await entryRef.set({
            mood,
            intensity,
            stress,
            energy,
            timestamp: logTs,
            color,
            dayKey,
        });
        moved++;
        await doc.ref.delete();
        deleted++;
    }
    return { ok: true, moved, deleted };
});
//# sourceMappingURL=index.js.map