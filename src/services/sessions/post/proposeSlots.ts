import { deleteField, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { sendTextMessage } from '../../messages/post/sendTextMessage'
import { updateSessionInviteForSession } from '../../messages/put/updateSessionInviteForSession'

export async function proposeSlots(
  sessionId: string,
  slots: Array<{ date: string; time: string }>,
  opts: {
    conversationId: string
    counselorId: string
    studentId: string
    counselorName: string
    note?: string
    proposalKind?: 'attendance_reschedule' | 'counselor_new_times'
    leadMessage?: string
  },
): Promise<void> {
  const { conversationId, counselorId, studentId, counselorName, note, proposalKind, leadMessage } =
    opts

  await assertMessagingOpenForParticipants(counselorId, studentId, counselorId)

  const sessionRef = doc(db, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) throw new Error('Session not found.')

  await updateDoc(sessionRef, {
    proposedSlots: slots,
    finalSlot: deleteField(),
    confirmedSlot: deleteField(),
    slotConfirmedAt: deleteField(),
    scheduledStartAt: deleteField(),
    status: 'pending',
    updatedAt: Timestamp.now(),
    ...(proposalKind === 'attendance_reschedule'
      ? { counselorRescheduleAt: Timestamp.now() }
      : {}),
  })

  if (leadMessage?.trim()) {
    await sendTextMessage(conversationId, counselorId, leadMessage.trim())
  }

  const primary = slots[0]
  const sessionData = {
    id: sessionId,
    sessionId,
    title: proposalKind === 'attendance_reschedule' ? 'Choose a new time' : 'Academic Guidance',
    counselorName,
    date: primary.date,
    time: primary.time,
    location: 'Guidance Office, West Wing',
    note: note?.trim() ?? '',
    timeSlots: slots,
    sessionStatus: 'pending',
  }

  await updateSessionInviteForSession(conversationId, counselorId, sessionId, sessionData)
}
