"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPastCollegeThread = isPastCollegeThread;
exports.assertConversationMessagingOpen = assertConversationMessagingOpen;
exports.assertMessagingOpenForParticipants = assertMessagingOpenForParticipants;
exports.assertSessionMessagingOpen = assertSessionMessagingOpen;
const https_1 = require("firebase-functions/v2/https");
const COLLEGE_CODES = new Set([
    'COE',
    'CSM',
    'CCS',
    'CED',
    'CASS',
    'CEBA',
    'CHS',
]);
function resolveCollegeFromUserData(data) {
    if (!data)
        return '';
    const cc = data.college_code;
    if (typeof cc === 'string' && COLLEGE_CODES.has(cc))
        return cc;
    const dept = data.department;
    if (typeof dept === 'string' && COLLEGE_CODES.has(dept))
        return dept;
    return '';
}
function conversationCollegeTag(data) {
    const raw = data?.college_code;
    return typeof raw === 'string' ? raw.trim() : '';
}
function isActiveCollegeInboxThread(input) {
    const viewer = input.viewerCollegeCode.trim();
    if (!viewer || !COLLEGE_CODES.has(viewer)) {
        return !isPastCollegeThread(input);
    }
    const tag = input.conversationCollegeCode.trim();
    const counselor = input.counselorCollegeCode.trim();
    const student = input.studentCollegeCode.trim();
    if (!tag || tag !== viewer)
        return false;
    if (!counselor || !COLLEGE_CODES.has(counselor) || counselor !== viewer) {
        return false;
    }
    if (!student || !COLLEGE_CODES.has(student) || student !== viewer) {
        return false;
    }
    return true;
}
function isPastCollegeThread(input) {
    const viewer = input.viewerCollegeCode.trim();
    if (!viewer || !COLLEGE_CODES.has(viewer)) {
        return false;
    }
    return !isActiveCollegeInboxThread(input);
}
async function assertMessagingClosedCheck(db, senderId, conversationData, counselorId, studentId) {
    if (senderId !== counselorId && senderId !== studentId) {
        throw new https_1.HttpsError('permission-denied', 'Not a conversation participant.');
    }
    const [cSnap, sSnap, senderSnap] = await Promise.all([
        counselorId ? db.collection('users').doc(counselorId).get() : null,
        studentId ? db.collection('users').doc(studentId).get() : null,
        db.collection('users').doc(senderId).get(),
    ]);
    const counselorCollege = resolveCollegeFromUserData(cSnap?.data());
    const studentCollege = resolveCollegeFromUserData(sSnap?.data());
    const viewerCollege = resolveCollegeFromUserData(senderSnap.data());
    if (isPastCollegeThread({
        conversationCollegeCode: conversationCollegeTag(conversationData),
        viewerCollegeCode: viewerCollege,
        counselorCollegeCode: counselorCollege,
        studentCollegeCode: studentCollege,
    })) {
        throw new https_1.HttpsError('failed-precondition', 'Messaging is closed for this conversation.');
    }
}
async function assertConversationMessagingOpen(db, conversationId, senderId) {
    const convSnap = await db.collection('conversations').doc(conversationId).get();
    if (!convSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Conversation not found.');
    }
    const conv = (convSnap.data() ?? {});
    const counselorId = typeof conv.counselorId === 'string' ? conv.counselorId : '';
    const studentId = typeof conv.studentId === 'string' ? conv.studentId : '';
    await assertMessagingClosedCheck(db, senderId, conv, counselorId, studentId);
}
async function assertMessagingOpenForParticipants(db, counselorId, studentId, senderId) {
    if (!counselorId || !studentId) {
        throw new https_1.HttpsError('failed-precondition', 'Conversation participants are required.');
    }
    const conversationId = `${counselorId}_${studentId}`;
    const convSnap = await db.collection('conversations').doc(conversationId).get();
    const conv = (convSnap.exists
        ? (convSnap.data() ?? {})
        : { counselorId, studentId });
    await assertMessagingClosedCheck(db, senderId, conv, counselorId, studentId);
}
async function assertSessionMessagingOpen(db, sessionId, senderId) {
    const sessionSnap = await db.collection('sessions').doc(sessionId).get();
    if (!sessionSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Session not found.');
    }
    const session = (sessionSnap.data() ?? {});
    const counselorId = typeof session.counselorId === 'string' ? session.counselorId : '';
    const studentId = typeof session.studentId === 'string' ? session.studentId : '';
    if (!counselorId || !studentId) {
        throw new https_1.HttpsError('failed-precondition', 'Session is missing counselor or student.');
    }
    await assertMessagingOpenForParticipants(db, counselorId, studentId, senderId);
}
//# sourceMappingURL=conversationMessagingPolicy.js.map