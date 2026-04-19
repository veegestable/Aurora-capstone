import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { CreateAnnouncementInput } from '../../../types/announcement.types'

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<string> {
  const docRef = await addDoc(collection(db, 'announcements'), {
    title: input.title.trim(),
    content: input.content.trim(),
    imageUrl: input.imageUrl?.trim() || null,
    targetRole: input.targetRole,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return docRef.id
}