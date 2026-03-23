import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { formatMessageTime } from './formatMessageTime'
import type { ChatMessage } from '../../types/message.types'

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

      if (data.type === 'session_invite') {
        const session = data.session ?? {}

        return {
          id: d.id,
          senderId,
          type: 'session' as const,
          session: { 
            ...session,
            id: data.sessionId ?? d.id
          },
          time: formatMessageTime(createdAt)
        }
      }

      if (data.type === 'session_request') {
        const req = data.sessionData ?? {}

        return {
          id: d.id,
          senderId,
          type: 'session_request' as const,
          sessionRequest: {
            id: d.id,
            sessionId: data.sessionId ?? req.sessionId ?? null,
            preferredTime: req.preferredTime ?? '',
            note: req.note ?? '',
            status: req.status ?? 'pending'
          },
          time: formatMessageTime(createdAt)
        }
      }

      return {
        id: d.id,
        senderId,
        type: 'text' as const,
        text: data.content ?? '',
        time: formatMessageTime(createdAt)
      }
    })
  } catch (error) {
    console.error('Error getting messages: ', error)
    throw error
  }
}