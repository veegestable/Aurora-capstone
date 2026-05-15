import type { CollegeCode } from '../constants/colleges'

export type AnnouncementTargetRole = 'all' | 'counselor' | 'student'

export type AnnouncementPublisherRole = 'admin' | 'counselor'

/**
 * Who can see the announcement (new model).
 * Legacy docs only have `targetRole` and no `visibility`.
 */
export type AnnouncementVisibility =
  | 'students_all'
  | 'counselors_all'
  | 'colleges_cross'
  | 'students_one_college'

export interface Announcement {
  id: string
  title: string
  content: string
  imageUrl?: string
  /** @deprecated Legacy; prefer `visibility`. Kept for older Firestore rows. */
  targetRole: AnnouncementTargetRole
  createdBy: string
  createdByName: string
  createdAt: Date
  publisherRole?: AnnouncementPublisherRole
  visibility?: AnnouncementVisibility
  /** When `visibility` is `colleges_cross` or `students_one_college`, audience college(s). */
  collegeCodes?: CollegeCode[]
  /** Short label for admin lists, e.g. "Students · all colleges". */
  audienceLabel?: string
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  imageUrl?: string
  publisherRole: AnnouncementPublisherRole
  visibility: AnnouncementVisibility
  /** Required for `colleges_cross` and `students_one_college`; omit or empty for global audiences. */
  collegeCodes?: CollegeCode[]
  createdBy: string
  createdByName: string
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  /** Pass `null` to clear the image, `undefined` to leave it unchanged. */
  imageUrl?: string | null
  publisherRole?: AnnouncementPublisherRole
  visibility?: AnnouncementVisibility
  collegeCodes?: CollegeCode[]
  /** @deprecated Synced from visibility for legacy consumers. */
  targetRole?: AnnouncementTargetRole
}