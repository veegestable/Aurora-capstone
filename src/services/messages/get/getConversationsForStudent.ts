import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { formatMessageTime } from '../formatMessageTime'
import type { CounselorContact } from '../../../types/message.types'

export async function getConversationsForStudent(
  studentId: string
): Promise<CounselorContact[]> {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('studentId', '==', studentId),
      orderBy('lastMessageAt', 'desc')
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((d) => {
      const data = d.data()

      return {
        id: data.counselorId,
        conversationId: d.id,
        name: data.counselor_name ?? 'Counselor',
        preview: data.lastMessage ?? 'No messages yet',
        time: data.lastMessageAt?.toDate 
          ? formatMessageTime(data.lastMessageAt.toDate()) 
          : 'Just now',
        avatar: data.counselor_avatar ?? '',
        isOnline: false,
        isUnread: (data.unreadCountStudent ?? 0) > 0
      }
    })
  } catch (error) {
    console.error('Error getting student conversations: ', error)
    throw error
  }
}