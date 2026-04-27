import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { formatMessageTime } from '../formatMessageTime'
import type { StudentContact } from '../../../types/message.types'

const isPlaceholderAvatar = (url: string) => !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url)

export async function getConversationsForCounselor(
  counselorId: string
): Promise<StudentContact[]> {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('counselorId', '==', counselorId),
      orderBy('lastMessageAt', 'desc')
    )
    const snapshot = await getDocs(q)

    const results = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data()

        let avatar = data.student_avatar ?? ''
        if ((!avatar || isPlaceholderAvatar(avatar)) && data.studentId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.studentId))
            const userAvatar = userDoc.data()?.avatar_url ?? ''
            if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
              avatar = userAvatar
              if (isPlaceholderAvatar(data.student_avatar ?? '')) {
                updateDoc(doc(db, 'conversations', d.id), { student_avatar: userAvatar }).catch(() => {})
              }
            }
          } catch { /* keep existing */ }
        }
        if (isPlaceholderAvatar(avatar)) avatar = ''

        return {
          id: data.studentId,
          conversationId: d.id,
          name: data.student_name ?? 'Student',
          preview: data.lastMessage ?? 'No messages yet',
          time: data.lastMessageAt?.toDate 
            ? formatMessageTime(data.lastMessageAt.toDate()) 
            : 'Just now',
          avatar,
          isOnline: false,
          isUnread: (data.unreadCountCounselor ?? 0) > 0,
          isAlerted: data.is_alerted ?? false,
          borderColor: data.border_color ?? undefined,
          program: data.student_program ?? undefined,
          studentId: data.studentId,
        }
      })
    )

    return results
  } catch (error) {
    console.error('Error getting counselor conversations: ', error)
    throw error
  }
}