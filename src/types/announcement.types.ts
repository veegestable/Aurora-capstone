export type AnnouncementTargetRole = 'all' | 'counselor' | 'student'

export interface Announcement {
  id: string
  title: string
  content: string
  imageUrl?: string
  targetRole: AnnouncementTargetRole
  createdBy: string
  createdByName: string
  createdAt: Date
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  imageUrl?: string
  targetRole: AnnouncementTargetRole
  createdBy: string
  createdByName: string
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  /** Pass `null` to clear the image, `undefined` to leave it unchanged. */
  imageUrl?: string | null
  targetRole?: AnnouncementTargetRole
}