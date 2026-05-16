import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { UpdateAnnouncementInput, AnnouncementVisibility } from '../../../types/announcement.types'
import { isCollegeCode } from '../../../constants/colleges'

function targetRoleFromVisibility(vis: AnnouncementVisibility): 'all' | 'counselor' | 'student' {
  if (vis === 'counselors_all') return 'counselor'
  if (vis === 'students_all' || vis === 'students_one_college') return 'student'
  return 'all'
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<void> {
  const ref = doc(db, 'announcements', id)
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  }
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.content !== undefined) updates.content = input.content.trim()
  if (input.imageUrl !== undefined) {
    updates.imageUrl = input.imageUrl === null ? null : input.imageUrl.trim() || null
  }
  if (input.publisherRole !== undefined) updates.publisherRole = input.publisherRole
  if (input.visibility !== undefined) {
    updates.visibility = input.visibility
    updates.targetRole = targetRoleFromVisibility(input.visibility)
  }
  if (input.collegeCodes !== undefined) {
    updates.collegeCodes = input.collegeCodes.filter((c) => isCollegeCode(c))
  }
  if (input.targetRole !== undefined) updates.targetRole = input.targetRole
  await updateDoc(ref, updates)
}