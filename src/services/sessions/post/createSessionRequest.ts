import { auth } from '../../../config/firebase'
import {
  grantCounselorJournalAccessTrusted,
  sendSessionRequestTrusted,
} from '../../trusted-backend.service'

interface CreateSessionRequestParams {
  studentId: string
  counselorId: string
  note: string
  preferredTime: string
  studentName?: string
  studentAvatar?: string
  counselorName?: string
  counselorAvatar?: string
}

function parseCallableError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    if (code.includes('resource-exhausted')) {
      return 'Session request sent too recently. Please wait a moment and try again.'
    }
    if (code.includes('permission-denied')) {
      return 'You cannot request a session with this counselor. Check that you share the same college.'
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Failed to send request. Please try again.'
}

/**
 * Student session request — conversation + session are created server-side
 * (`sendSessionRequestTrusted`), matching mobile's trusted callable flow.
 */
export async function createSessionRequest(
  params: CreateSessionRequestParams,
): Promise<string> {
  const {
    studentId,
    counselorId,
    note,
    preferredTime,
    studentName,
    studentAvatar,
    counselorName,
    counselorAvatar,
  } = params

  if ((auth.currentUser?.uid ?? '') !== studentId) {
    throw new Error('You can only request sessions as the signed-in student.')
  }

  const conversationId = `${counselorId}_${studentId}`

  try {
    const { sessionId } = await sendSessionRequestTrusted({
      conversationId,
      counselorId,
      preferredTime: preferredTime.trim(),
      note: note.trim(),
      studentName,
      studentAvatar,
      counselorName,
      counselorAvatar,
    })

    try {
      await grantCounselorJournalAccessTrusted({ studentId, counselorId })
    } catch (e) {
      console.warn('[sessions] grantCounselorJournalAccessTrusted skipped:', e)
    }

    return sessionId
  } catch (error: unknown) {
    console.error('sendSessionRequestTrusted failed:', error)
    throw new Error(parseCallableError(error))
  }
}
