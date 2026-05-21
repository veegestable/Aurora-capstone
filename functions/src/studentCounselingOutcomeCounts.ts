import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  resolveCollegeFromUserData,
  resolveConversationCollegeCode,
} from './ensureConversationAdmin';

export type CounselingOutcomeCounts = {
  completed: number;
  missed: number;
  withYouCompleted: number;
  withYouMissed: number;
};

async function getRoleForUid(
  db: admin.firestore.Firestore,
  uid: string,
): Promise<string> {
  const snap = await db.collection('users').doc(uid).get();
  const role = snap.data()?.role;
  return typeof role === 'string' ? role : 'unknown';
}

async function assertCounselorCanViewStudentOutcomes(
  db: admin.firestore.Firestore,
  counselorUid: string,
  studentId: string,
): Promise<string> {
  const role = await getRoleForUid(db, counselorUid);
  if (role !== 'counselor' && role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Only counselors can view student counseling history.',
    );
  }

  const studentSnap = await db.collection('users').doc(studentId).get();
  if (!studentSnap.exists) {
    throw new HttpsError('not-found', 'Student not found.');
  }

  const collegeCode = await resolveConversationCollegeCode(
    db,
    counselorUid,
    studentId,
  );
  if (!collegeCode) {
    throw new HttpsError(
      'failed-precondition',
      'Could not resolve college for this student.',
    );
  }

  if (role === 'admin') return collegeCode;

  const counselorSnap = await db.collection('users').doc(counselorUid).get();
  const counselorCollege = resolveCollegeFromUserData(
    counselorSnap.data() as Record<string, unknown> | undefined,
  );
  const studentCollege = resolveCollegeFromUserData(
    studentSnap.data() as Record<string, unknown> | undefined,
  );
  if (!counselorCollege || counselorCollege !== studentCollege) {
    throw new HttpsError(
      'permission-denied',
      'You can only view counseling history for students in your college.',
    );
  }

  return collegeCode;
}

/**
 * Lifetime totals for this student across every counselor and college tag on `sessions`.
 * (College is only used in {@link assertCounselorCanViewStudentOutcomes} — not to filter rows.)
 */
export async function countStudentCounselingOutcomes(
  db: admin.firestore.Firestore,
  studentId: string,
  viewingCounselorId: string,
): Promise<CounselingOutcomeCounts> {
  const snapshot = await db
    .collection('sessions')
    .where('studentId', '==', studentId)
    .get();

  let completed = 0;
  let missed = 0;
  let withYouCompleted = 0;
  let withYouMissed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const st = String(data.status ?? '');
    const isMine = String(data.counselorId ?? '') === viewingCounselorId;

    if (st === 'completed') {
      completed += 1;
      if (isMine) withYouCompleted += 1;
    } else if (st === 'missed') {
      missed += 1;
      if (isMine) withYouMissed += 1;
    }
  }

  return { completed, missed, withYouCompleted, withYouMissed };
}

export function createGetStudentCounselingOutcomeCountsTrusted(
  db: admin.firestore.Firestore,
) {
  return onCall({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const data = (request.data ?? {}) as { studentId?: string };
    const studentId =
      typeof data.studentId === 'string' ? data.studentId.trim() : '';
    if (!studentId) {
      throw new HttpsError('invalid-argument', 'studentId is required.');
    }

    await assertCounselorCanViewStudentOutcomes(db, uid, studentId);
    const counts = await countStudentCounselingOutcomes(db, studentId, uid);

    return { ok: true, ...counts };
  });
}
