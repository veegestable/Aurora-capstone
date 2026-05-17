import * as admin from 'firebase-admin';

const COLLEGE_CODES = new Set([
  'COE',
  'CSM',
  'CCS',
  'CED',
  'CASS',
  'CEBA',
  'CHS',
]);

function resolveCollegeFromUserData(
  data: Record<string, unknown> | undefined,
): string {
  if (!data) return '';
  const cc = data.college_code;
  if (typeof cc === 'string' && COLLEGE_CODES.has(cc)) return cc;
  const dept = data.department;
  if (typeof dept === 'string' && COLLEGE_CODES.has(dept)) return dept;
  return '';
}

async function resolveConversationCollegeCode(
  db: admin.firestore.Firestore,
  counselorId: string,
  studentId: string,
): Promise<string> {
  const [cSnap, sSnap] = await Promise.all([
    db.collection('users').doc(counselorId).get(),
    db.collection('users').doc(studentId).get(),
  ]);
  const studentCollege = resolveCollegeFromUserData(
    sSnap.data() as Record<string, unknown> | undefined,
  );
  if (studentCollege) return studentCollege;
  return resolveCollegeFromUserData(
    cSnap.data() as Record<string, unknown> | undefined,
  );
}

export type EnsureConversationInput = {
  counselorId: string;
  studentId: string;
  studentName?: string;
  studentAvatar?: string;
  counselorName?: string;
  counselorAvatar?: string;
};

/** Admin upsert for `conversations/{counselorId}_{studentId}` (bypasses client rules). */
export async function ensureConversationDocument(
  input: EnsureConversationInput,
): Promise<string> {
  const db = admin.firestore();
  const conversationId = `${input.counselorId}_${input.studentId}`;
  const convRef = db.collection('conversations').doc(conversationId);
  const snap = await convRef.get();
  const collegeCode = await resolveConversationCollegeCode(
    db,
    input.counselorId,
    input.studentId,
  );

  const profileFields: Record<string, unknown> = {
    counselorId: input.counselorId,
    studentId: input.studentId,
    student_name: input.studentName?.trim() || 'Student',
    student_avatar: input.studentAvatar?.trim() || '',
    counselor_name: input.counselorName?.trim() || 'Counselor',
    counselor_avatar: input.counselorAvatar?.trim() || '',
    ...(collegeCode ? { college_code: collegeCode } : {}),
  };

  if (!snap.exists) {
    await convRef.set({
      ...profileFields,
      lastMessage: '',
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSenderId: null,
      unreadCountCounselor: 0,
      unreadCountStudent: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await convRef.set(profileFields, { merge: true });
  }

  return conversationId;
}
