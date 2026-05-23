import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { formatMessageTime } from '../helpers/formatMessageTime'
import { stripAutoAcceptedPrefix } from '../helpers/sanitizeMessageText'
import type { ChatMessage } from '../../../types/message.types'

export async function getMessagesForStudent(
  conversationId: string,
  studentId: string
): Promise<ChatMessage[]> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((d) => {
      const data = d.data()
      const createdAt = data.createdAt?.toDate?.() ?? new Date()
      const isMe = data.senderId === studentId
      const senderId = isMe ? 'me' : 'them'

      if (data.type === 'session_invite' || data.type === 'session') {
        const session = (data.sessionData ?? data.session ?? {}) as Record<string, unknown>
        const timeSlots = (session.timeSlots as Array<{ date: string; time: string }> | undefined) ?? []
        const agreedSlot = session.agreedSlot as { date: string; time: string } | undefined
        const firstSlot = agreedSlot ?? timeSlots[0]
        const scheduledStartAt = session.scheduledStartAt as { toMillis?: () => number } | undefined
        const scheduledStartAtMs =
          typeof scheduledStartAt?.toMillis === 'function'
            ? scheduledStartAt.toMillis()
            : null

        return {
          id: d.id,
          senderId,
          type: 'session' as const,
          session: {
            ...(session as object),
            id: String(data.sessionId ?? session.sessionId ?? data.linkedSessionId ?? d.id),
            title: typeof session.title === 'string' ? session.title : 'Counseling Session',
            timeSlots,
            note: typeof session.note === 'string' ? session.note : '',
            sessionStatus:
              typeof session.sessionStatus === 'string'
                ? session.sessionStatus
                : typeof session.status === 'string'
                  ? session.status
                  : 'pending',
            agreedSlot,
            date: firstSlot?.date ?? (typeof session.date === 'string' ? session.date : ''),
            time: firstSlot?.time ?? (typeof session.time === 'string' ? session.time : ''),
            scheduledStartAtMs,
          },
          time: formatMessageTime(createdAt),
        }
      }

      if (data.type === 'session_request') {
        const req = (data.sessionData ?? {}) as Record<string, unknown>

        return {
          id: d.id,
          senderId,
          type: 'session_request' as const,
          sessionRequest: {
            id: d.id,
            sessionId:
              (data.sessionId as string | undefined) ??
              (req.sessionId as string | undefined) ??
              null,
            preferredTime:
              typeof req.preferredTime === 'string' && req.preferredTime.trim()
                ? req.preferredTime
                : '',
            note: typeof req.note === 'string' ? req.note : '',
            status: typeof req.status === 'string' ? req.status : 'requested',
            requestedAtMs: createdAt.getTime(),
          },
          time: formatMessageTime(createdAt),
        }
      }

      return {
        id: d.id,
        senderId,
        type: 'text' as const,
        text: stripAutoAcceptedPrefix(data.content ?? ''),
        time: formatMessageTime(createdAt)
      }
    })
  } catch (error) {
    console.error('Error getting messages: ', error)
    throw error
  }
}