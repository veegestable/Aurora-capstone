import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

/** Must match every `onCall({ region: 'asia-southeast2' })` in `functions/src/index.ts`. */
const functions = getFunctions(getApp(), "asia-southeast2");

type TargetRoute = "/(student)/messages" | "/(counselor)/messages";

export async function writeAuditLogTrusted(input: {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const callable = httpsCallable<
    {
      action: string;
      targetType: string;
      targetId: string;
      metadata?: Record<string, unknown>;
    },
    { ok: boolean }
  >(functions, "writeAuditLogTrusted");
  await callable(input);
}

export async function createSessionNotificationTrusted(input: {
  userId: string;
  message: string;
  targetRoute?: TargetRoute;
  eventKey?: string;
}): Promise<void> {
  const callable = httpsCallable<
    {
      userId: string;
      message: string;
      targetRoute?: TargetRoute;
      eventKey?: string;
    },
    { ok: boolean }
  >(functions, "createSessionNotificationTrusted");
  await callable(input);
}

export async function grantCounselorJournalAccessTrusted(input: {
  studentId: string;
  counselorId: string;
}): Promise<void> {
  const callable = httpsCallable<
    { studentId: string; counselorId: string },
    { ok: boolean }
  >(functions, "grantCounselorJournalAccessTrusted");
  await callable(input);
}

export async function sendTextMessageTrusted(input: {
  conversationId: string;
  text: string;
}): Promise<{ messageId: string }> {
  const callable = httpsCallable<
    { conversationId: string; text: string },
    { ok: boolean; messageId: string }
  >(functions, "sendTextMessageTrusted");
  const result = await callable(input);
  return { messageId: result.data.messageId };
}

export type SignUpTrustedInput = {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "counselor";
  college_code: string;
  program?: string;
  contact_number?: string;
};

export async function signUpTrusted(
  input: SignUpTrustedInput,
): Promise<{ uid: string }> {
  const callable = httpsCallable<SignUpTrustedInput, { ok: boolean; uid: string }>(
    functions,
    "signUpTrusted",
  );
  const result = await callable(input);
  return { uid: result.data.uid };
}

export async function resendRegistrationVerificationTrusted(input: {
  email: string;
  password: string;
}): Promise<void> {
  const callable = httpsCallable<
    { email: string; password: string },
    { ok: boolean }
  >(functions, "resendRegistrationVerificationTrusted");
  await callable(input);
}

export async function sendSessionRequestTrusted(input: {
  conversationId: string;
  preferredTime: string;
  note?: string;
}): Promise<{ messageId: string; sessionId: string }> {
  const callable = httpsCallable<
    { conversationId: string; preferredTime: string; note?: string },
    { ok: boolean; messageId: string; sessionId: string }
  >(functions, "sendSessionRequestTrusted");
  const result = await callable(input);
  return { messageId: result.data.messageId, sessionId: result.data.sessionId };
}

export async function updateSessionRequestTrusted(input: {
  conversationId: string;
  messageId: string;
  sessionId: string;
  preferredTime: string;
  note?: string;
}): Promise<void> {
  const callable = httpsCallable<
    {
      conversationId: string;
      messageId: string;
      sessionId: string;
      preferredTime: string;
      note?: string;
    },
    { ok: boolean }
  >(functions, "updateSessionRequestTrusted");
  await callable(input);
}

export async function createCounselorSessionInviteTrusted(input: {
  studentId: string;
  proposedSlots: Array<{ date: string; time: string }>;
  note?: string;
}): Promise<{ sessionId: string }> {
  const callable = httpsCallable<
    {
      studentId: string;
      proposedSlots: Array<{ date: string; time: string }>;
      note?: string;
    },
    { ok: boolean; sessionId: string }
  >(functions, "createCounselorSessionInviteTrusted");
  const result = await callable(input);
  return { sessionId: result.data.sessionId };
}

export type StudentCounselingOutcomeCounts = {
  completed: number;
  missed: number;
  withYouCompleted: number;
  withYouMissed: number;
};

export async function getStudentCounselingOutcomeCountsTrustedCallable(
  studentId: string,
): Promise<StudentCounselingOutcomeCounts> {
  const authUser = getAuth(getApp()).currentUser;
  if (!authUser) {
    throw new Error("FirebaseError: unauthenticated");
  }
  await authUser.getIdToken();

  const callable = httpsCallable<
    { studentId: string },
    {
      ok: boolean;
      completed: number;
      missed: number;
      withYouCompleted: number;
      withYouMissed: number;
    }
  >(functions, "getStudentCounselingOutcomeCountsTrusted");
  const result = await callable({ studentId });
  return {
    completed: result.data.completed ?? 0,
    missed: result.data.missed ?? 0,
    withYouCompleted: result.data.withYouCompleted ?? 0,
    withYouMissed: result.data.withYouMissed ?? 0,
  };
}
