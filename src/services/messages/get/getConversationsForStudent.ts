import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { formatMessageTime } from '../helpers/formatMessageTime'
import { formatConversationPreview } from '../helpers/sanitizeMessageText'
import { inferConversationPreviewKind } from '../helpers/classifyConversationPreview'
import type { CounselorContact } from '../../../types/message.types'

const isPlaceholderAvatar = (url: string) => !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url)

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

    const results = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data()

        let avatar = data.counselor_avatar ?? ''
        if ((!avatar || isPlaceholderAvatar(avatar)) && data.counselorId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.counselorId))
            const userAvatar = userDoc.data()?.avatar_url ?? ''
            if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
              avatar = userAvatar
            }
          } catch { /* keep existing */ }
        }
        if (isPlaceholderAvatar(avatar)) avatar = ''

        return {
          id: data.counselorId,
          conversationId: d.id,
          name: data.counselor_name ?? 'Counselor',
          preview: formatConversationPreview(data.lastMessage),
          previewKind: inferConversationPreviewKind(data.lastMessage),
          time: data.lastMessageAt?.toDate 
            ? formatMessageTime(data.lastMessageAt.toDate()) 
            : 'Just now',
          avatar,
          isOnline: false,
          isUnread: (data.unreadCountStudent ?? 0) > 0
        }
      })
    )

    return results
  } catch (error) {
    console.error('Error getting student conversations: ', error)
    throw error
  }
}