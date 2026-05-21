import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { createCounselorSessionInviteTrusted } from '../../trusted-backend.service'
import { collection, doc, getDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface ProposedSlot {
  date: string
  time: string
}

function parseInviteCallableError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    const rawMessage =
      'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : ''

    if (code.includes('failed-precondition')) {
      if (rawMessage.toLowerCase().includes('future')) {
        return 'Please choose a future schedule. Past time slots are not allowed.'
      }
      return 'One or more selected time slots are not allowed. Please choose a future schedule.'
    }

    if (code.includes('invalid-argument')) {
      if (rawMessage.toLowerCase().includes('invalid')) {
        return 'Please pick a valid date and time from the schedule fields.'
      }
      return 'Please review the selected schedule and try again.'
    }

    if (code.includes('resource-exhausted')) {
      return 'You sent invites too quickly. Please wait a moment and try again.'
    }

    if (rawMessage) return rawMessage
  }

  if (error instanceof Error && error.message.trim()) return error.message
  return 'Failed to send invite. Please try again.'
}

export async function createCounselorSessionInvite(
  counselorId: string,
  studentId: string,
  proposedSlots: ProposedSlot[],
  opts?: { note?: string }
) {
  await assertMessagingOpenForParticipants(counselorId, studentId, counselorId)
  const conversationId = `${counselorId}_${studentId}`
  let out: { sessionId: string }
  try {
    out = await createCounselorSessionInviteTrusted({
      studentId,
      proposedSlots,
      note: opts?.note,
    })
  } catch (error: unknown) {
    throw new Error(parseInviteCallableError(error))
  }

  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)
  if (!convSnap.exists()) {
    throw new Error('Conversation not found after creating session invite.')
  }
  const conv = convSnap.data()

  const messageSessionData = {
    id: out.sessionId,
    sessionId: out.sessionId,
    title: 'Counseling Session',
    timeSlots: proposedSlots,
    note: opts?.note?.trim() ?? '',
    sessionStatus: 'pending',
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const msgRef = doc(messagesRef)
  const now = Timestamp.now()
  const batch = writeBatch(db)

  batch.set(msgRef, {
    senderId: counselorId,
    content: `Session: ${messageSessionData.title}`,
    type: 'session_invite',
    sessionId: out.sessionId,
    linkedSessionId: out.sessionId,
    sessionData: messageSessionData,
    isRead: false,
    readAt: null,
    isUrgent: false,
    createdAt: now,
  })

  batch.update(convRef, {
    lastMessage: `Session: ${messageSessionData.title}`,
    lastMessageAt: now,
    lastSenderId: counselorId,
    unreadCountStudent: (conv?.unreadCountStudent ?? 0) + 1,
  })

  await batch.commit()
  return out.sessionId
}