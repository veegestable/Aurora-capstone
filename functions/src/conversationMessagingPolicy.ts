import { HttpsError } from 'firebase-functions/v2/https';
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

function conversationCollegeTag(
  data: Record<string, unknown> | undefined,
): string {
  const raw = data?.college_code;
  return typeof raw === 'string' ? raw.trim() : '';
}

function isActiveCollegeInboxThread(input: {
  conversationCollegeCode: string;
  viewerCollegeCode: string;
  counselorCollegeCode: string;
  studentCollegeCode: string;
}): boolean {
  const viewer = input.viewerCollegeCode.trim();
  if (!viewer || !COLLEGE_CODES.has(viewer)) {
    return !isPastCollegeThread(input);
  }

  const tag = input.conversationCollegeCode.trim();
  const counselor = input.counselorCollegeCode.trim();
  const student = input.studentCollegeCode.trim();

  if (!tag || tag !== viewer) return false;
  if (!counselor || !COLLEGE_CODES.has(counselor) || counselor !== viewer) {
    return false;
  }
  if (!student || !COLLEGE_CODES.has(student) || student !== viewer) {
    return false;
  }

  return true;
}

export function isPastCollegeThread(input: {
  conversationCollegeCode: string;
  viewerCollegeCode: string;
  counselorCollegeCode: string;
  studentCollegeCode: string;
}): boolean {
  const viewer = input.viewerCollegeCode.trim();
  if (!viewer || !COLLEGE_CODES.has(viewer)) {
    return false;
  }
  return !isActiveCollegeInboxThread(input);
}

async function assertMessagingClosedCheck(
  db: admin.firestore.Firestore,
  senderId: string,
  conversationData: Record<string, unknown>,
  counselorId: string,
  studentId: string,
): Promise<void> {
  if (senderId !== counselorId && senderId !== studentId) {
    throw new HttpsError('permission-denied', 'Not a conversation participant.');
  }

  const [cSnap, sSnap, senderSnap] = await Promise.all([
    counselorId ? db.collection('users').doc(counselorId).get() : null,
    studentId ? db.collection('users').doc(studentId).get() : null,
    db.collection('users').doc(senderId).get(),
  ]);

  const counselorCollege = resolveCollegeFromUserData(
    cSnap?.data() as Record<string, unknown> | undefined,
  );
  const studentCollege = resolveCollegeFromUserData(
    sSnap?.data() as Record<string, unknown> | undefined,
  );
  const viewerCollege = resolveCollegeFromUserData(
    senderSnap.data() as Record<string, unknown> | undefined,
  );

  if (
    isPastCollegeThread({
      conversationCollegeCode: conversationCollegeTag(conversationData),
      viewerCollegeCode: viewerCollege,
      counselorCollegeCode: counselorCollege,
      studentCollegeCode: studentCollege,
    })
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Messaging is closed for this conversation.',
    );
  }
}

export async function assertConversationMessagingOpen(
  db: admin.firestore.Firestore,
  conversationId: string,
  senderId: string,
): Promise<void> {
  const convSnap = await db.collection('conversations').doc(conversationId).get();
  if (!convSnap.exists) {
    throw new HttpsError('not-found', 'Conversation not found.');
  }
  const conv = (convSnap.data() ?? {}) as Record<string, unknown>;
  const counselorId =
    typeof conv.counselorId === 'string' ? conv.counselorId : '';
  const studentId = typeof conv.studentId === 'string' ? conv.studentId : '';
  await assertMessagingClosedCheck(db, senderId, conv, counselorId, studentId);
}

export async function assertMessagingOpenForParticipants(
  db: admin.firestore.Firestore,
  counselorId: string,
  studentId: string,
  senderId: string,
): Promise<void> {
  if (!counselorId || !studentId) {
    throw new HttpsError(
      'failed-precondition',
      'Conversation participants are required.',
    );
  }
  const conversationId = `${counselorId}_${studentId}`;
  const convSnap = await db.collection('conversations').doc(conversationId).get();
  const conv = (
    convSnap.exists
      ? (convSnap.data() ?? {})
      : { counselorId, studentId }
  ) as Record<string, unknown>;
  await assertMessagingClosedCheck(db, senderId, conv, counselorId, studentId);
}

export async function assertSessionMessagingOpen(
  db: admin.firestore.Firestore,
  sessionId: string,
  senderId: string,
): Promise<void> {
  const sessionSnap = await db.collection('sessions').doc(sessionId).get();
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Session not found.');
  }
  const session = (sessionSnap.data() ?? {}) as Record<string, unknown>;
  const counselorId =
    typeof session.counselorId === 'string' ? session.counselorId : '';
  const studentId =
    typeof session.studentId === 'string' ? session.studentId : '';
  if (!counselorId || !studentId) {
    throw new HttpsError(
      'failed-precondition',
      'Session is missing counselor or student.',
    );
  }
  await assertMessagingOpenForParticipants(
    db,
    counselorId,
    studentId,
    senderId,
  );
}
