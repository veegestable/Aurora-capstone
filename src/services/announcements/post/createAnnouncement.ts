import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { CreateAnnouncementInput, AnnouncementVisibility } from '../../../types/announcement.types'
import { isCollegeCode } from '../../../constants/colleges'

function targetRoleFromVisibility(vis: AnnouncementVisibility): 'all' | 'counselor' | 'student' {
  if (vis === 'counselors_all') return 'counselor'
  if (vis === 'students_all' || vis === 'students_one_college') return 'student'
  return 'all'
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<string> {
  const codes = (input.collegeCodes ?? []).filter((c) => isCollegeCode(c))
  const targetRole = targetRoleFromVisibility(input.visibility)
  const docRef = await addDoc(collection(db, 'announcements'), {
    title: input.title.trim(),
    content: input.content.trim(),
    imageUrl: input.imageUrl?.trim() || null,
    publisherRole: input.publisherRole,
    visibility: input.visibility,
    collegeCodes: codes.length > 0 ? codes : [],
    targetRole,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return docRef.id
}