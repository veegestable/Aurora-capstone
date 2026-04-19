import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { UpdateAnnouncementInput } from '../../../types/announcement.types'

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
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
  if (input.targetRole !== undefined) updates.targetRole = input.targetRole

  await updateDoc(ref, updates)
}