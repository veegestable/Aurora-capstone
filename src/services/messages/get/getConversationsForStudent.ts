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
  conversationInboxClassifyFromData,
  isActiveCollegeInboxThread,
  isPastCollegeThread,
  resolveCollegeFromUserRecord,
} from '../../../utils/conversationCollegeMessaging'
import { counselorEligibleForStudent } from '../../../utils/counselorStudentPolicy'
import {
  isCollegeCode,
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../../constants/colleges'
import { formatMessageTime } from '../helpers/formatMessageTime'
import { formatConversationPreview } from '../helpers/sanitizeMessageText'
import { inferConversationPreviewKind } from '../helpers/classifyConversationPreview'
import { fetchUserCollegeMap } from '../helpers/fetchUserCollegeMap'
import type { CounselorContact } from '../../../types/message.types'

export type ConversationInboxScope = 'active' | 'past'

const isPlaceholderAvatar = (url: string) =>
  !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url)

async function resolveStudentActiveCollege(
  studentId: string,
  hint?: string | null,
): Promise<string> {
  const fromHint = hint
    ? resolveCollegeCodeFromUserData({ college_code: hint })
    : ''
  if (fromHint && isCollegeCode(fromHint)) return fromHint

  try {
    const sSnap = await getDoc(doc(db, 'users', studentId))
    if (sSnap.exists()) {
      return resolveCollegeFromUserRecord((sSnap.data() ?? {}) as Record<string, unknown>)
    }
  } catch {
    /* use empty */
  }
  return ''
}

export async function getConversationsForStudent(
  studentId: string,
  options?: {
    activeCollegeCode?: string | null
    /** Legacy department field — used when college_code missing (mobile parity). */
    department?: string | null
    inboxScope?: ConversationInboxScope
  },
): Promise<CounselorContact[]> {
  const collegeHint =
    resolveCollegeCodeFromUserData({
      college_code: options?.activeCollegeCode,
      department: options?.department,
    }) ||
    (options?.activeCollegeCode ?? '').trim()

  const activeCollege = await resolveStudentActiveCollege(studentId, collegeHint)

  const inboxScope = options?.inboxScope ?? 'active'

  try {
    const q = query(
      collection(db, 'conversations'),
      where('studentId', '==', studentId),
      orderBy('lastMessageAt', 'desc'),
    )
    const snapshot = await getDocs(q)

    const collegeMap = await fetchUserCollegeMap([
      studentId,
      ...snapshot.docs.map((d) => String(d.data().counselorId ?? '')),
    ])

    const scopedDocs = snapshot.docs.filter((d) => {
      const data = d.data() as Record<string, unknown>
      const classify = conversationInboxClassifyFromData(data, activeCollege, collegeMap)
      const past = isPastCollegeThread(classify)
      if (inboxScope === 'past') return past
      return isActiveCollegeInboxThread(classify)
    })

    const results = await Promise.all(
      scopedDocs.map(async (d) => {
        const data = d.data() as Record<string, unknown>
        const counselorId = String(data.counselorId ?? '').trim()
        if (!counselorId) return null

        let profileName = ''
        let profileAvatar = ''
        try {
          const userDoc = await getDoc(doc(db, 'users', counselorId))
          if (userDoc.exists()) {
            const counselorProfile = userDoc.data() as Record<string, unknown>
            if (
              inboxScope === 'active' &&
              !counselorEligibleForStudent(
                { id: counselorId, ...counselorProfile },
                activeCollege as CollegeCode | '',
              )
            ) {
              return null
            }
            profileName =
              typeof counselorProfile.full_name === 'string'
                ? counselorProfile.full_name.trim()
                : ''
            profileAvatar =
              typeof counselorProfile.avatar_url === 'string'
                ? counselorProfile.avatar_url
                : ''
          } else if (inboxScope === 'active') {
            return null
          }
        } catch {
          if (inboxScope === 'active') return null
        }

        const classify = conversationInboxClassifyFromData(data, activeCollege, collegeMap)
        const messagingClosed = isPastCollegeThread(classify)

        let avatar = String(data.counselor_avatar ?? '')
        if (
          (!avatar || isPlaceholderAvatar(avatar)) &&
          profileAvatar &&
          !isPlaceholderAvatar(profileAvatar)
        ) {
          avatar = profileAvatar
        }
        if (isPlaceholderAvatar(avatar)) avatar = ''

        const displayName =
          profileName || String(data.counselor_name ?? '').trim() || 'Counselor'

        const contact: CounselorContact = {
          id: counselorId,
          conversationId: d.id,
          name: displayName,
          preview: formatConversationPreview(data.lastMessage),
          previewKind: inferConversationPreviewKind(data.lastMessage),
          time:
            data.lastMessageAt &&
            typeof data.lastMessageAt === 'object' &&
            'toDate' in data.lastMessageAt &&
            typeof (data.lastMessageAt as { toDate: () => Date }).toDate === 'function'
              ? formatMessageTime((data.lastMessageAt as { toDate: () => Date }).toDate())
              : 'Just now',
          avatar,
          isOnline: false,
          isUnread: (Number(data.unreadCountStudent ?? 0) || 0) > 0,
          messagingClosed,
          isPastCollege: messagingClosed,
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
