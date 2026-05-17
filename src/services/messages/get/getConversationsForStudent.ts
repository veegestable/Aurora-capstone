import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../../constants/colleges'
import {
  conversationMatchesActiveCollege,
  counselorEligibleForStudent,
} from '../../../utils/counselorStudentPolicy'
import { formatMessageTime } from '../helpers/formatMessageTime'
import { formatConversationPreview } from '../helpers/sanitizeMessageText'
import { inferConversationPreviewKind } from '../helpers/classifyConversationPreview'
import type { CounselorContact } from '../../../types/message.types'

const isPlaceholderAvatar = (url: string) =>
  !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url)

export async function getConversationsForStudent(
  studentId: string,
  options?: { activeCollegeCode?: string | null },
): Promise<CounselorContact[]> {
  let activeCollege = (options?.activeCollegeCode ?? '').trim()
  if (!activeCollege) {
    try {
      const sSnap = await getDoc(doc(db, 'users', studentId))
      if (sSnap.exists()) {
        activeCollege =
          resolveCollegeCodeFromUserData(
            (sSnap.data() ?? {}) as Record<string, unknown>,
          ) ?? ''
      }
    } catch {
      activeCollege = ''
    }
  }

  try {
    const q = query(
      collection(db, 'conversations'),
      where('studentId', '==', studentId),
      orderBy('lastMessageAt', 'desc'),
    )
    const snapshot = await getDocs(q)

    const results = await Promise.all(
      snapshot.docs
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .map(async (d) => {
          const data = d.data()
          const counselorId = String(data.counselorId ?? '').trim()
          if (!counselorId) return null

          let counselorProfile: Record<string, unknown> | null = null
          try {
            const userDoc = await getDoc(doc(db, 'users', counselorId))
            if (!userDoc.exists()) return null
            counselorProfile = {
              id: counselorId,
              ...(userDoc.data() ?? {}),
            } as Record<string, unknown>
          } catch {
            return null
          }

          if (
            !counselorEligibleForStudent(
              counselorProfile,
              activeCollege as CollegeCode | '',
            )
          ) {
            return null
          }

          let avatar = data.counselor_avatar ?? ''
          const profileAvatar =
            typeof counselorProfile.avatar_url === 'string'
              ? counselorProfile.avatar_url
              : ''
          if (
            (!avatar || isPlaceholderAvatar(avatar)) &&
            profileAvatar &&
            !isPlaceholderAvatar(profileAvatar)
          ) {
            avatar = profileAvatar
          }
          if (isPlaceholderAvatar(avatar)) avatar = ''

          const displayName =
            typeof counselorProfile.full_name === 'string' &&
            counselorProfile.full_name.trim()
              ? counselorProfile.full_name.trim()
              : (data.counselor_name ?? 'Counselor')

          const contact: CounselorContact = {
            id: counselorId,
            conversationId: d.id,
            name: displayName,
            preview: formatConversationPreview(data.lastMessage),
            previewKind: inferConversationPreviewKind(data.lastMessage),
            time: data.lastMessageAt?.toDate
              ? formatMessageTime(data.lastMessageAt.toDate())
              : 'Just now',
            avatar,
            isOnline: false,
            isUnread: (data.unreadCountStudent ?? 0) > 0,
          }
          return contact
        }),
    )

    return results.filter((r): r is CounselorContact => r !== null)
  } catch (error) {
    console.error('Error getting student conversations: ', error)
    throw error
  }
}
