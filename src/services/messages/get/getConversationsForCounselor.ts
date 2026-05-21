import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../../constants/colleges'
import {
  conversationMatchesActiveCollege,
  studentEligibleForCounselorInbox,
} from '../../../utils/counselorStudentPolicy'
import { getCounselorArchivedConversationIds } from './getCounselorArchivedConversationIds'
import { formatMessageTime } from '../helpers/formatMessageTime'
import { formatConversationPreview } from '../helpers/sanitizeMessageText'
import { inferConversationPreviewKind } from '../helpers/classifyConversationPreview'
import type { StudentContact } from '../../../types/message.types'

const isPlaceholderAvatar = (url: string) =>
  !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url)

export async function getConversationsForCounselor(
  counselorId: string,
  options?: { activeCollegeCode?: string | null },
): Promise<StudentContact[]> {
  let activeCollege = (options?.activeCollegeCode ?? '').trim()
  if (!activeCollege) {
    try {
      const cSnap = await getDoc(doc(db, 'users', counselorId))
      if (cSnap.exists()) {
        activeCollege =
          resolveCollegeCodeFromUserData(
            (cSnap.data() ?? {}) as Record<string, unknown>,
          ) ?? ''
      }
    } catch {
      activeCollege = ''
    }
  }

  try {
    const q = query(
      collection(db, 'conversations'),
      where('counselorId', '==', counselorId),
      orderBy('lastMessageAt', 'desc'),
    )
    const snapshot = await getDocs(q)
    const archivedIds = await getCounselorArchivedConversationIds(counselorId)

    const results = await Promise.all(
      snapshot.docs
        .filter((d) => !archivedIds.has(d.id))
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .map(async (d) => {
          const data = d.data()
          const studentId = String(data.studentId ?? '').trim()
          if (!studentId) return null

          try {
            const userDoc = await getDoc(doc(db, 'users', studentId))
            if (!userDoc.exists()) return null
            const studentProfile = {
              id: studentId,
              ...(userDoc.data() ?? {}),
            } as Record<string, unknown>
            if (
              !studentEligibleForCounselorInbox(
                studentProfile,
                activeCollege as CollegeCode | '',
              )
            ) {
              return null
            }
          } catch {
            return null
          }

          let avatar = data.student_avatar ?? ''
          if ((!avatar || isPlaceholderAvatar(avatar)) && studentId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', studentId))
              const userAvatar = userDoc.data()?.avatar_url ?? ''
              if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
                avatar = userAvatar
                if (isPlaceholderAvatar(data.student_avatar ?? '')) {
                  updateDoc(doc(db, 'conversations', d.id), {
                    student_avatar: userAvatar,
                  }).catch(() => {})
                }
              }
            } catch {
              /* keep existing */
            }
          }
          if (isPlaceholderAvatar(avatar)) avatar = ''

          const contact: StudentContact = {
            id: studentId,
            conversationId: d.id,
            name: data.student_name ?? 'Student',
            preview: formatConversationPreview(data.lastMessage),
            previewKind: inferConversationPreviewKind(data.lastMessage),
            time: data.lastMessageAt?.toDate
              ? formatMessageTime(data.lastMessageAt.toDate())
              : 'Just now',
            avatar,
            isOnline: false,
            isUnread: (data.unreadCountCounselor ?? 0) > 0,
            isAlerted: data.is_alerted ?? false,
            borderColor: data.border_color ?? undefined,
            program: data.student_program ?? undefined,
            studentId,
          }
          return contact
        }),
    )

    return results.filter((r): r is StudentContact => r !== null)
  } catch (error) {
    console.error('Error getting counselor conversations: ', error)
    throw error
  }
}
