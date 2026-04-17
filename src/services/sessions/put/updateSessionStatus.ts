import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { SessionStatus, TimeSlot } from '../../../types/session.types'

interface UpdateSessionParams {
  sessionId: string
  status: SessionStatus
  confirmedSlot?: TimeSlot
  cancelReason?: string
  attendanceNote?: string
}

export async function updateSessionStatus(params: UpdateSessionParams): Promise<void> {
  const { sessionId, status, confirmedSlot, cancelReason, attendanceNote } = params

  const patch: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now()
  }

  if (confirmedSlot) {
    patch.confirmedSlot = confirmedSlot
    patch.finalSlot = confirmedSlot
  }
  if (cancelReason !== undefined) patch.cancelReason = cancelReason
  if (attendanceNote !== undefined) patch.attendanceNote = attendanceNote

  await updateDoc(doc(db, 'sessions', sessionId), patch)
}