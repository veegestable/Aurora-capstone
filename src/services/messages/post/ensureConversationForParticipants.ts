import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { resolveConversationCollegeCode } from '../helpers/resolveConversationCollegeCode'

/**
 * Ensures `conversations/{counselorId}_{studentId}` exists (student or counselor caller).
 * Uses update-then-create because rules block reading a missing conversation doc.
 */
export async function ensureConversationForParticipants(params: {
  counselorId: string
  studentId: string
  studentName?: string
  studentAvatar?: string
  counselorName?: string
  counselorAvatar?: string
}): Promise<string> {
  const {
    counselorId,
    studentId,
    studentName,
    studentAvatar,
    counselorName,
    counselorAvatar,
  } = params

  const conversationId = `${counselorId}_${studentId}`
  const convRef = doc(db, 'conversations', conversationId)
  const collegeCode = await resolveConversationCollegeCode(counselorId, studentId)

  const profileFields: Record<string, unknown> = {
    counselorId,
    studentId,
    student_name: studentName ?? 'Student',
    student_avatar: studentAvatar ?? '',
    counselor_name: counselorName ?? 'Counselor',
    counselor_avatar: counselorAvatar ?? '',
    ...(collegeCode ? { college_code: collegeCode } : {}),
  }

  try {
    await updateDoc(convRef, profileFields)
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : ''
    const isMissingDoc =
      code === 'not-found' ||
      code === 'permission-denied' ||
      code === '5' ||
      /no document to update/i.test(
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '',
      )
    if (!isMissingDoc) throw e

    await setDoc(convRef, {
      ...profileFields,
      lastMessage: '',
      lastMessageAt: Timestamp.now(),
      lastSenderId: null,
      unreadCountCounselor: 0,
      unreadCountStudent: 0,
      createdAt: Timestamp.now(),
    })
  }

  return conversationId
}
