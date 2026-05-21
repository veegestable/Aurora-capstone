import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  conversationCollegeTagFromData,
  isPastCollegeThread,
  MESSAGING_CLOSED_ERROR,
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

async function assertMessagingClosedCheck(
  senderId: string,
  conversationData: Record<string, unknown>,
  counselorId: string,
  studentId: string,
): Promise<void> {
  if (senderId !== counselorId && senderId !== studentId) {
    throw new Error('Not a conversation participant.')
  }
  const collegeMap = await fetchUserCollegeMap([
    counselorId,
    studentId,
    senderId,
  ])
  const viewerCollege = collegeMap[senderId] ?? ''
  if (
    isPastCollegeThread({
      conversationCollegeCode: conversationCollegeTagFromData(conversationData),
      viewerCollegeCode: viewerCollege,
      counselorCollegeCode: collegeMap[counselorId] ?? '',
      studentCollegeCode: collegeMap[studentId] ?? '',
    })
  ) {
    throw new Error(MESSAGING_CLOSED_ERROR)
  }
}

export async function assertConversationMessagingOpen(
  conversationId: string,
  senderId: string,
): Promise<void> {
  const convSnap = await getDoc(doc(db, 'conversations', conversationId))
  if (!convSnap.exists()) {
    throw new Error('Conversation not found.')
  }
  const data = (convSnap.data() ?? {}) as Record<string, unknown>
  await assertMessagingClosedCheck(
    senderId,
    data,
    String(data.counselorId ?? ''),
    String(data.studentId ?? ''),
  )
}

export async function assertMessagingOpenForParticipants(
  counselorId: string,
  studentId: string,
  senderId: string,
): Promise<void> {
  const conversationId = `${counselorId}_${studentId}`
  const convSnap = await getDoc(doc(db, 'conversations', conversationId))
  const data = (
    convSnap.exists()
      ? (convSnap.data() ?? {})
      : { counselorId, studentId }
  ) as Record<string, unknown>
  await assertMessagingClosedCheck(senderId, data, counselorId, studentId)
}

export async function assertSessionMessagingOpen(
  sessionId: string,
  senderId: string,
): Promise<void> {
  const snap = await getDoc(doc(db, 'sessions', sessionId))
  if (!snap.exists()) throw new Error('Session not found.')
  const data = snap.data() as Record<string, unknown>
  const counselorId = String(data.counselorId ?? '')
  const studentId = String(data.studentId ?? '')
  if (!counselorId || !studentId) {
    throw new Error('Session is missing counselor or student.')
  }
  await assertMessagingOpenForParticipants(counselorId, studentId, senderId)
}
