import { usersService } from '../../users'
import type { CounselorContact } from '../../../types/message.types'
import { ensureConversationForParticipants } from './ensureConversationForParticipants'

export interface OpenCounselorThreadInput {
  studentId: string
  studentName: string
  studentAvatar?: string
  counselorId: string
}

/**
 * Mobile `addConversation` + open thread: ensure conversation exists, return contact row.
 */
export async function openCounselorThreadForStudent(
  input: OpenCounselorThreadInput,
): Promise<CounselorContact> {
  const counselorId = input.counselorId.trim()
  if (!counselorId) {
    throw new Error('Choose a counselor to continue.')
  }

  const counselors = await usersService.getCounselorsForStudent(input.studentId)
  const counselor = counselors.find((c) => c.id === counselorId)
  if (!counselor) {
    throw new Error(
      'That counselor is not available for messaging yet. They must be approved, email-verified, and assigned to your college.',
    )
  }

  const conversationId = await ensureConversationForParticipants({
    counselorId,
    studentId: input.studentId,
    studentName: input.studentName,
    studentAvatar: input.studentAvatar,
    counselorName: counselor.full_name ?? 'Counselor',
    counselorAvatar: counselor.avatar_url,
  })

  return {
    id: counselorId,
    conversationId,
    name: counselor.full_name ?? 'Counselor',
    preview: 'No messages yet',
    time: 'Just now',
    avatar: counselor.avatar_url ?? '',
    isOnline: false,
    isUnread: false,
  }
}
