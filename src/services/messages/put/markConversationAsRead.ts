import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  conversationCollegeTagFromData,
  isPastCollegeThread,
  resolveCollegeFromUserRecord,
} from '../../../utils/conversationCollegeMessaging'

async function fetchUserCollegeMap(
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter((id) => id.trim()))]
  const map: Record<string, string> = {}
  await Promise.all(
    unique.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id))
        map[id] = resolveCollegeFromUserRecord(
          (snap.data() ?? {}) as Record<string, unknown>,
        )
      } catch {
        map[id] = ''
      }
    }),
  )
  return map
}

export async function markConversationAsRead(conversationId: string, viewerId: string): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId)
    const convSnap = await getDoc(convRef)
    const conv = convSnap.data()

    if (!conv) return

    const convData = conv as Record<string, unknown>
    const counselorId = String(convData.counselorId ?? '')
    const studentId = String(convData.studentId ?? '')
    const collegeMap = await fetchUserCollegeMap([viewerId, counselorId, studentId])
    if (
      isPastCollegeThread({
        conversationCollegeCode: conversationCollegeTagFromData(convData),
        viewerCollegeCode: collegeMap[viewerId] ?? '',
        counselorCollegeCode: collegeMap[counselorId] ?? '',
        studentCollegeCode: collegeMap[studentId] ?? '',
      })
    ) {
      return
    }

    // Determine if the person viewing is the Counselor or the Student
    const isCounselorViewer = conv.counselorId === viewerId
    const unreadField = isCounselorViewer ? 'unreadCountCounselor' : 'unreadCountStudent'

    const updates: Promise<unknown>[] = [
      updateDoc(convRef, { [unreadField]: 0 }),
    ]

    // Also mark all individual messages from the other person as read
    const messagesRef = collection(db, 'conversations', conversationId, 'messages')
    const snapshot = await getDocs(query(messagesRef, orderBy('createdAt', 'desc')))

    snapshot.docs.forEach((d) => {
      const data = d.data()
      const senderId = typeof data.senderId === 'string' ? data.senderId : ''
      const isRead = data.isRead === true

      if (senderId && senderId !== viewerId && !isRead) {
        updates.push(
          updateDoc(doc(db, 'conversations', conversationId, 'messages', d.id), {
            isRead: true,
            readAt: Timestamp.now(),
          })
        )
      }
    })

    await Promise.all(updates)
  } catch (error: unknown) {
    console.error('Failed to mark conversation as read:', error)
  }
}
