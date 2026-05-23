import { deleteField, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export type SessionAttendanceOutcome = 'completed' | 'missed' | 'rescheduled'

export async function markSessionAttendance(
  sessionId: string,
  outcome: SessionAttendanceOutcome,
  opts: { counselorId: string; studentId: string; attendanceNote?: string },
): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) throw new Error('Session not found.')

  const data = snap.data() as Record<string, unknown>
  if (String(data.counselorId ?? '') !== opts.counselorId) {
    throw new Error('Only the assigned counselor can mark attendance for this session.')
  }
  if (String(data.studentId ?? '') !== opts.studentId) {
    throw new Error('Session student does not match.')
  }

  const currentStatus = String(snap.data()?.status ?? '')
  const needsConfirmFirst =
    (currentStatus === 'pending' || currentStatus === 'requested') &&
    (outcome === 'completed' || outcome === 'missed')

  if (needsConfirmFirst) {
    await updateDoc(sessionRef, {
      status: 'confirmed',
      updatedAt: Timestamp.now(),
    })
  }

  const badge =
    outcome === 'completed' ? 'completed' : outcome === 'missed' ? 'missed' : 'pending'

  await updateDoc(sessionRef, {
    status: outcome,
    attendanceNote: opts.attendanceNote ?? null,
    updatedAt: Timestamp.now(),
    expiredAt: null,
    schedulingOverdueAt: null,
    sessionHistoryBadge: badge,
    ...(outcome === 'rescheduled'
      ? {
          finalSlot: deleteField(),
          confirmedSlot: deleteField(),
          scheduledStartAt: deleteField(),
          slotConfirmedAt: deleteField(),
        }
      : {}),
  })
}
