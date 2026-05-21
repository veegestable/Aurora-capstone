import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'
import { counselorClearInboxArchive } from '../delete/counselorClearInboxArchive'
import { resolveConversationCollegeCode } from '../helpers/resolveConversationCollegeCode'

interface StudentData {
  id: string
  name: string
  avatar?: string
  program?: string
  isAlerted: boolean
  borderColor?: string
}

interface CounselorData {
  name: string
  avatar?: string
}

export async function createConversation(
  counselorId: string,
  student: StudentData,
  counselor: CounselorData
): Promise<string> {
  const conversationId = `${counselorId}_${student.id}`
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)

  const collegeCode = await resolveConversationCollegeCode(counselorId, student.id)

  if (!convSnap.exists()) {
    await setDoc(convRef, {
      counselorId,
      studentId: student.id,
      student_name: student.name,
      student_avatar: student.avatar || '',
      student_program: student.program || '',
      counselor_name: counselor.name,
      counselor_avatar: counselor.avatar || '',
      is_alerted: student.isAlerted,
      border_color: student.borderColor || null,
      ...(collegeCode ? { college_code: collegeCode } : {}),
      lastMessage: 'Conversation started',
      lastMessageAt: Timestamp.now(),
      lastSenderId: counselorId,
      unreadCountCounselor: 0,
      unreadCountStudent: 0,
      createdAt: Timestamp.now(),
    })
  } else {
    // Update the existing conversation's alert status if it has changed
    await setDoc(convRef, {
      is_alerted: student.isAlerted,
      border_color: student.borderColor || null,
      ...(collegeCode ? { college_code: collegeCode } : {}),
    }, { merge: true })
  }

  const uid = auth.currentUser?.uid ?? ''
  if (uid === counselorId) {
    await counselorClearInboxArchive(counselorId, conversationId)
  }

  return conversationId
}