import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { SessionStatus, TimeSlot } from '../../../types/session.types'
import { auditLogsService } from '../../audit-logs'
import { SESSION_SCHEDULING_TIMEZONE } from '../../../constants/session-scheduling'
import { parseSessionSlotToMillisManila } from '../../../utils/sessionSlotAuthority'

interface UpdateSessionParams {
  sessionId: string
  status: SessionStatus
  confirmedSlot?: TimeSlot
  cancelReason?: string
  attendanceNote?: string
  performedBy?: string
  performedByRole?: string
}

export async function updateSessionStatus(params: UpdateSessionParams): Promise<void> {
  const { sessionId, status, confirmedSlot, cancelReason, attendanceNote, performedBy, performedByRole } = params

  const patch: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now()
  }

  if (confirmedSlot) {
    patch.confirmedSlot = confirmedSlot
    patch.finalSlot = confirmedSlot
    const ms = parseSessionSlotToMillisManila(confirmedSlot)
    if (ms != null) {
      patch.scheduledStartAt = Timestamp.fromMillis(ms)
      patch.schedulingTimezone = SESSION_SCHEDULING_TIMEZONE
    }
  }
  if (cancelReason !== undefined) patch.cancelReason = cancelReason
  if (attendanceNote !== undefined) patch.attendanceNote = attendanceNote

  await updateDoc(doc(db, 'sessions', sessionId), patch)

  if (performedBy && performedByRole) {
    auditLogsService.writeAuditLog({
      performedBy,
      performedByRole,
      action: `session_${status}`,
      targetType: 'session',
      targetId: sessionId
    })
  }
}