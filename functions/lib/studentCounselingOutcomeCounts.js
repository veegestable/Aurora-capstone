"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countStudentCounselingOutcomes = countStudentCounselingOutcomes;
exports.createGetStudentCounselingOutcomeCountsTrusted = createGetStudentCounselingOutcomeCountsTrusted;
const https_1 = require("firebase-functions/v2/https");
const ensureConversationAdmin_1 = require("./ensureConversationAdmin");
async function getRoleForUid(db, uid) {
    const snap = await db.collection('users').doc(uid).get();
    const role = snap.data()?.role;
    return typeof role === 'string' ? role : 'unknown';
}
async function assertCounselorCanViewStudentOutcomes(db, counselorUid, studentId) {
    const role = await getRoleForUid(db, counselorUid);
    if (role !== 'counselor' && role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only counselors can view student counseling history.');
    }
    const studentSnap = await db.collection('users').doc(studentId).get();
    if (!studentSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Student not found.');
    }
    const collegeCode = await (0, ensureConversationAdmin_1.resolveConversationCollegeCode)(db, counselorUid, studentId);
    if (!collegeCode) {
        throw new https_1.HttpsError('failed-precondition', 'Could not resolve college for this student.');
    }
    if (role === 'admin')
        return collegeCode;
    const counselorSnap = await db.collection('users').doc(counselorUid).get();
    const counselorCollege = (0, ensureConversationAdmin_1.resolveCollegeFromUserData)(counselorSnap.data());
    const studentCollege = (0, ensureConversationAdmin_1.resolveCollegeFromUserData)(studentSnap.data());
    if (!counselorCollege || counselorCollege !== studentCollege) {
        throw new https_1.HttpsError('permission-denied', 'You can only view counseling history for students in your college.');
    }
    return collegeCode;
}
/**
 * Lifetime totals for this student across every counselor and college tag on `sessions`.
 * (College is only used in {@link assertCounselorCanViewStudentOutcomes} — not to filter rows.)
 */
async function countStudentCounselingOutcomes(db, studentId, viewingCounselorId) {
    const snapshot = await db
        .collection('sessions')
        .where('studentId', '==', studentId)
        .get();
    let completed = 0;
    let missed = 0;
    let withYouCompleted = 0;
    let withYouMissed = 0;
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const st = String(data.status ?? '');
        const isMine = String(data.counselorId ?? '') === viewingCounselorId;
        if (st === 'completed') {
            completed += 1;
            if (isMine)
                withYouCompleted += 1;
        }
        else if (st === 'missed') {
            missed += 1;
            if (isMine)
                withYouMissed += 1;
        }
    }
    return { completed, missed, withYouCompleted, withYouMissed };
}
function createGetStudentCounselingOutcomeCountsTrusted(db) {
    return (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
        const uid = request.auth?.uid;
        if (!uid)
            throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
        const data = (request.data ?? {});
        const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
        if (!studentId) {
            throw new https_1.HttpsError('invalid-argument', 'studentId is required.');
        }
        await assertCounselorCanViewStudentOutcomes(db, uid, studentId);
        const counts = await countStudentCounselingOutcomes(db, studentId, uid);
        return { ok: true, ...counts };
    });
}
//# sourceMappingURL=studentCounselingOutcomeCounts.js.map