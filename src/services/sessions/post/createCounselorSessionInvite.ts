import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { createCounselorSessionInviteTrusted } from '../../trusted-backend.service'

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
  const out = await createCounselorSessionInviteTrusted({
    studentId,
    proposedSlots,
    note: opts?.note,
  })
  return out.sessionId
}