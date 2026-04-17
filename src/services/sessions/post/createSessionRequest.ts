import { collection, addDoc, doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface CreateSessionRequestParams {
  studentId: string
  counselorId: string
  note: string
  studentName?: string
  studentAvatar?: string
  counselorName?: string
  counselorAvatar?: string
}

export async function createSessionRequest(params: CreateSessionRequestParams): Promise<string> {
  const {
    studentId, counselorId, note, studentName,
    studentAvatar, counselorName, counselorAvatar
  } = params

  const sessionDoc = {
    counselorId,
    studentId,
    riskFlagId: null,
    initiatedBy: 'student',
    studentRequestNote: note.trim(),
    proposedSlots: [],
    confirmedSlot: null,
    finalSlot: null,
    status: 'requested',
    attendanceNote: null,
    cancelReason: null,
    reminderSent: false,
    sessionHistoryBadge: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  const sessionRef = await addDoc(collection(db, 'sessions'), sessionDoc)
  const sessionId = sessionRef.id

  const conversationId = `${counselorId}_${studentId}`
  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)

  if (!convSnap.exists()) {
    await setDoc(convRef, {
      counselorId,
      studentId,
      student_name: studentName ?? 'Student',
      student_avatar: studentAvatar ?? '',
      counselor_name: counselorName ?? 'Counselor',
      counselor_avatar: counselorAvatar ?? '',
      lastMessage: 'Session request',
      lastMessageAt: Timestamp.now(),
      lastSenderId: studentId,
      unreadCountCounselor: 1,
      unreadCountStudent: 0,
      createdAt: Timestamp.now(),
    })
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  await addDoc(messagesRef, {
    senderId: studentId,
    content: 'Session request',
    type: 'session_request',
    sessionId,
    sessionData: {
      sessionId,
      note: note.trim(),
      status: 'requested'
    },
    isRead: false,
    readAt: null,
    isUrgent: false,
    createdAt: Timestamp.now()
  })

  if (convSnap.exists()) {
    const conv = convSnap.data()
    await updateDoc(convRef, {
      lastMessage: 'Session request',
      lastMessageAt: Timestamp.now(),
      lastSenderId: studentId,
      unreadCountCounselor: (conv?.unreadCountCounselor ?? 0) + 1
    })
  }

  return sessionId
}