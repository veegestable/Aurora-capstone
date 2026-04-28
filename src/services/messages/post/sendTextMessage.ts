import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function sendTextMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<string> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const docRef = await addDoc(messagesRef, {
      senderId,
      content: text,
      type: 'chat',
      sessionId: null,
      isRead: false,
      readAt: null,
      isUrgent: false,
      createdAt: Timestamp.now()
    })

    const convRef = doc(db, 'conversations', conversationId)
    const convSnap = await getDoc(convRef)
    const conv = convSnap.data()
    const isCounselor = conv?.counselorId === senderId

    const updatePayload: Record<string, unknown> = {
      lastMessage: text.length > 80 ? text.slice(0, 80) + '...' : text,
      lastMessageAt: Timestamp.now(),
      lastSenderId: senderId
    }

    if (isCounselor) {
      updatePayload.unreadCountStudent = (conv?.unreadCountStudent ?? 0) + 1
    } else {
      updatePayload.unreadCountCounselor = (conv?.unreadCountCounselor ?? 0) + 1
    }

    await updateDoc(convRef, updatePayload)
    return docRef.id
  } catch (error) {
    console.error('Error sending text message: ', error)
    throw error
  }
}