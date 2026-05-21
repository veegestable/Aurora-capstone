import { auth } from '../../../config/firebase'
import {
  grantCounselorJournalAccessTrusted,
  sendSessionRequestTrusted,
} from '../../trusted-backend.service'

function formatPreferredTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function parseCallableError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    const rawMessage =
      'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : ''
    if (code.includes('resource-exhausted')) {
      return 'Session request sent too recently. Please wait a moment and try again.'
    }
    if (code.includes('not-found')) {
      return "This conversation isn't ready yet. Go back and open your counselor's chat again."
    }
    if (code.includes('failed-precondition')) {
      if (rawMessage.toLowerCase().includes('future')) {
        return 'Please choose a future schedule. Past time slots are not allowed.'
      }
      return 'This schedule is not allowed. Please choose a future date and time.'
    }
    if (code.includes('invalid-argument')) {
      return 'Please provide a valid date and time for your session request.'
    }
    if (rawMessage) {
      return rawMessage
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Failed to send request. Please try again.'
}

/** Same as mobile `firestoreService.sendSessionRequest` — requires an existing conversation. */
export async function sendSessionRequestFromConversation(params: {
  conversationId: string
  studentId: string
  counselorId: string
  preferredDate: Date
  note: string
}): Promise<void> {
  if ((auth.currentUser?.uid ?? '') !== params.studentId) {
    throw new Error('You can only request sessions as the signed-in student.')
  }
  if (!params.conversationId?.trim()) {
    throw new Error("This conversation isn't ready yet. Open your counselor's chat again.")
  }

  const preferredTime = formatPreferredTime(params.preferredDate)
  try {
    await sendSessionRequestTrusted({
      conversationId: params.conversationId.trim(),
      preferredTime,
      note: params.note.trim(),
    })
    try {
      await grantCounselorJournalAccessTrusted({
        studentId: params.studentId,
        counselorId: params.counselorId,
      })
    } catch (e) {
      console.warn('[sessions] grantCounselorJournalAccessTrusted skipped:', e)
    }
  } catch (error: unknown) {
    console.error('sendSessionRequestTrusted failed:', error)
    throw new Error(parseCallableError(error))
  }
}
