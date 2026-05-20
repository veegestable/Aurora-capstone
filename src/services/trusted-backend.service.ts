import { getApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

/** Must match every `onCall({ region: 'asia-southeast2' })` in `functions/src/index.ts`. */
const functions = getFunctions(getApp(), 'asia-southeast2')

export type SignUpTrustedInput = {
  email: string
  password: string
  fullName: string
  role: 'student' | 'counselor'
  college_code: string
  program?: string
  contact_number?: string
}

export async function signUpTrusted(
  input: SignUpTrustedInput,
): Promise<{ uid: string }> {
  const callable = httpsCallable<SignUpTrustedInput, { ok: boolean; uid: string }>(
    functions,
    'signUpTrusted',
  )
  const result = await callable(input)
  return { uid: result.data.uid }
}

export async function resendRegistrationVerificationTrusted(input: {
  email: string
  password: string
}): Promise<void> {
  const callable = httpsCallable<
    { email: string; password: string },
    { ok: boolean }
  >(functions, 'resendRegistrationVerificationTrusted')
  await callable(input)
}

export async function grantCounselorJournalAccessTrusted(input: {
  studentId: string
  counselorId: string
}): Promise<void> {
  const callable = httpsCallable<
    { studentId: string; counselorId: string },
    { ok: boolean }
  >(functions, 'grantCounselorJournalAccessTrusted')
  await callable(input)
}

export async function sendSessionRequestTrusted(input: {
  conversationId: string
  counselorId?: string
  preferredTime: string
  note?: string
  studentName?: string
  studentAvatar?: string
  counselorName?: string
  counselorAvatar?: string
}): Promise<{ messageId: string; sessionId: string }> {
  const callable = httpsCallable<
    {
      conversationId: string
      counselorId?: string
      preferredTime: string
      note?: string
      studentName?: string
      studentAvatar?: string
      counselorName?: string
      counselorAvatar?: string
    },
    { ok: boolean; messageId: string; sessionId: string }
  >(functions, 'sendSessionRequestTrusted')
  const result = await callable(input)
  return { messageId: result.data.messageId, sessionId: result.data.sessionId }
}

export async function createCounselorSessionInviteTrusted(input: {
  studentId: string
  proposedSlots: Array<{ date: string; time: string }>
  note?: string
}): Promise<{ sessionId: string }> {
  const callable = httpsCallable<
    {
      studentId: string
      proposedSlots: Array<{ date: string; time: string }>
      note?: string
    },
    { ok: boolean; sessionId: string }
  >(functions, 'createCounselorSessionInviteTrusted')
  const result = await callable(input)
  return { sessionId: result.data.sessionId }
}

export type StudentCounselingOutcomeCounts = {
  completed: number
  missed: number
  withYouCompleted: number
  withYouMissed: number
}

export async function getStudentCounselingOutcomeCountsTrusted(
  studentId: string,
): Promise<StudentCounselingOutcomeCounts> {
  const callable = httpsCallable<
    { studentId: string },
    {
      ok: boolean
      completed: number
      missed: number
      withYouCompleted: number
      withYouMissed: number
    }
  >(functions, 'getStudentCounselingOutcomeCountsTrusted')
  const result = await callable({ studentId })
  return {
    completed: result.data.completed ?? 0,
    missed: result.data.missed ?? 0,
    withYouCompleted: result.data.withYouCompleted ?? 0,
    withYouMissed: result.data.withYouMissed ?? 0,
  }
}
