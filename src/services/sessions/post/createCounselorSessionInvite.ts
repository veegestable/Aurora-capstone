import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { resolveConversationCollegeCode } from '../../messages/helpers/resolveConversationCollegeCode'
import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { enqueueSessionInviteStudentPush } from '../../notifications/enqueueSessionInviteStudentPush'

interface ProposedSlot {
  date: string
  time: string
}

export async function createCounselorSessionInvite(
  counselorId: string,
  studentId: string,
  proposedSlots: ProposedSlot[],
  opts?: { note?: string }
) {
  await assertMessagingOpenForParticipants(counselorId, studentId, counselorId)

  // 1. Create the session document
  const collegeCode = await resolveConversationCollegeCode(counselorId, studentId)

  const docData = {
    counselorId,
    studentId,
    riskFlagId: null,
    ...(collegeCode ? { college_code: collegeCode } : {}),
    initiatedBy: 'counselor',
    studentRequestNote: (opts?.note ?? '').trim(),
    proposedSlots,
    confirmedSlot: null,
    finalSlot: null,
    status: 'pending',
    attendanceNote: null,
    cancelReason: null,
    reminderSent: false,
    sessionHistoryBadge: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  const sessionRef = await addDoc(collection(db, 'sessions'), docData)
  const sessionId = sessionRef.id

  // 2. Add the session invite message to the conversation
  const conversationId = `${counselorId}_${studentId}`
  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  
  await addDoc(messagesRef, {
    senderId: counselorId,
    content: 'Session Invite',
    type: 'session_invite',
    sessionId,
    sessionData: {
      sessionId,
      title: 'Counseling Session',
      note: opts?.note?.trim() || undefined,
      timeSlots: proposedSlots,
      status: 'pending'
    },
    isRead: false,
    readAt: null,
    isUrgent: false,
    createdAt: Timestamp.now(),
  })

  // 3. Update the conversation preview
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)
  const conv = convSnap.data()
  
  if (conv) {
    await updateDoc(convRef, {
      lastMessage: 'Session Invite',
      lastMessageAt: Timestamp.now(),
      lastSenderId: counselorId,
      unreadCountStudent: (conv.unreadCountStudent ?? 0) + 1,
    })
  }

  await enqueueSessionInviteStudentPush(studentId, sessionId)

  return sessionId
}