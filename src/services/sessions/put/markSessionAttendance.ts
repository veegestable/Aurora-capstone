import { deleteField, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { assertCounselorCanMarkSessionAttendance } from '../../../utils/sessionScheduling'

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

  assertCounselorCanMarkSessionAttendance({
    status: String(data.status ?? ''),
    finalSlot: data.finalSlot as { date: string; time: string } | null | undefined,
    confirmedSlot: data.confirmedSlot as { date: string; time: string } | null | undefined,
    proposedSlots: Array.isArray(data.proposedSlots)
      ? (data.proposedSlots as Array<{ date: string; time: string }>)
      : undefined,
    preferredTimeFromStudent:
      typeof data.preferredTimeFromStudent === 'string'
        ? data.preferredTimeFromStudent
        : undefined,
    scheduledStartAt: data.scheduledStartAt,
  })

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
