import { getApp } from "firebase/app";
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
