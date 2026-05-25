import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { Announcement, AnnouncementVisibility } from '../../types/announcement.types'
import { isCollegeCode, type CollegeCode } from '../../constants/colleges'

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'mock-1',
    title: 'Welcome to Aurora',
    content:
      'Your mental wellness companion. Track your mood, connect with counselors, and explore resources tailored for you.',
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(),
    visibility: 'students_all',
    publisherRole: 'admin',
    audienceLabel: 'Students · all colleges',
  },
  {
    id: 'mock-2',
    title: 'Wellness Tip',
    content:
      'Take a moment to breathe. Small check-ins can make a big difference in how you feel.',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(Date.now() - 86_400_000),
    visibility: 'students_all',
    publisherRole: 'admin',
    audienceLabel: 'Students · all colleges',
  },
  {
    id: 'mock-3',
    title: 'Counselor Support Available',
    content:
      'Remember that our counselors are here for you. Request a session anytime from the Messages screen.',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(Date.now() - 172_800_000),
    visibility: 'students_all',
    publisherRole: 'admin',
    audienceLabel: 'Students · all colleges',
  },
]

// Internal helpers 

function normalizeCollegeCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((c): c is string => typeof c === 'string' && isCollegeCode(c))
}

function inferLegacyVisibility(
  targetRole: string | undefined,
): AnnouncementVisibility | undefined {
  const tr = targetRole ?? 'all'
  if (tr === 'student') return 'students_all'
  if (tr === 'counselor') return 'counselors_all'
  return undefined
}

// Audience matching

export type AnnouncementReaderRole = 'counselor' | 'student' | 'admin'

export interface AnnouncementReaderOptions {
  viewerUserId?: string
}

/**
 * Whether this announcement should appear for the viewer.
 * Mirrors the mobile `announcementMatchesReader()` logic.
 */
export function announcementMatchesReader(
  viewerRole: AnnouncementReaderRole,
  viewerCollegeCode: string | undefined,
  data: Record<string, unknown>,
  options?: AnnouncementReaderOptions,
): boolean {
  const college = (viewerCollegeCode ?? '').trim()
  const viewerUserId = (options?.viewerUserId ?? '').trim()
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy.trim() : ''

  // Admins see everything
  if (viewerRole === 'admin') return true
  // Author always sees their own
  if (viewerUserId && createdBy && viewerUserId === createdBy) return true

  const visRaw = data.visibility as string | undefined
  const codes = normalizeCollegeCodes(data.collegeCodes)

  // Legacy docs without `visibility` — fall back to `targetRole`
  if (!visRaw) {
    const tr = (data.targetRole ?? 'all') as string
    if (tr === 'all') return true
    if (tr === 'student') return viewerRole === 'student'
    if (tr === 'counselor') return viewerRole === 'counselor'
    return false
  }

  const vis = visRaw as AnnouncementVisibility
  switch (vis) {
    case 'students_all':
      return viewerRole === 'student'
    case 'counselors_all':
      return viewerRole === 'counselor'
    case 'everyone':
      return viewerRole === 'student' || viewerRole === 'counselor'
    case 'colleges_cross':
      if (!college || codes.length === 0) return false
      return codes.includes(college)
    case 'students_one_college':
      if (!college || codes.length === 0) return false
      if (!codes.includes(college)) return false
      return viewerRole === 'student' || viewerRole === 'counselor'
    default:
      return false
  }
}

// Audience label 

/** Human-readable audience for admin UI. */
export function formatAnnouncementAudienceLabel(a: Announcement): string {
  if (a.audienceLabel) return a.audienceLabel
  const vis = a.visibility ?? inferLegacyVisibility(a.targetRole)
  const codes = a.collegeCodes?.length ? a.collegeCodes.join(', ') : ''
  if (!vis) return 'Everyone (legacy)'
  switch (vis) {
    case 'students_all':
      return 'Students · all colleges'
    case 'counselors_all':
      return 'Counselors · all colleges'
    case 'everyone':
      return 'All students & counselors'
    case 'colleges_cross':
      return codes ? `Students & counselors · ${codes}` : 'Selected colleges'
    case 'students_one_college':
      return codes ? `Students & counselors · ${codes}` : 'Students · one college'
    default:
      return 'Custom'
  }
}

// Doc → Announcement mappers 

/** Map Firestore docs → Announcements with audience filter + 3-week TTL. */
export function mapAnnouncementsForRole(
  docs: QueryDocumentSnapshot[],
  role: AnnouncementReaderRole,
  viewerCollegeCode: string | undefined,
  maxCount: number,
  viewerUserId?: string,
): Announcement[] {
  const now = Date.now()
  const list = docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>
      if (!announcementMatchesReader(role, viewerCollegeCode, data, { viewerUserId })) {
        return null
      }

      const createdAt =
        (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
        new Date()
      if (now - createdAt.getTime() > THREE_WEEKS_MS) return null

      const collegeCodes = normalizeCollegeCodes(data.collegeCodes) as CollegeCode[]
      const vis =
        (data.visibility as AnnouncementVisibility | undefined) ??
        inferLegacyVisibility(data.targetRole as string | undefined)

      const ann: Announcement = {
        id: d.id,
        title: String(data.title ?? ''),
        content: String(data.content ?? ''),
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
        targetRole: String(data.targetRole ?? 'all') as Announcement['targetRole'],
        createdBy: String(data.createdBy ?? ''),
        createdByName: String(data.createdByName ?? ''),
        createdAt,
        publisherRole: data.publisherRole as Announcement['publisherRole'],
        visibility: vis,
        collegeCodes: collegeCodes.length ? collegeCodes : undefined,
      }
      ann.audienceLabel = formatAnnouncementAudienceLabel(ann)
      return ann
    })
    .filter(Boolean) as Announcement[]

  return list.slice(0, maxCount)
}

/** Map Firestore docs → Announcements with NO filters. Admin view. */
export function mapAnnouncementsAll(docs: QueryDocumentSnapshot[]): Announcement[] {
  return docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    const createdAt: Date =
      (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date()
    const collegeCodes = normalizeCollegeCodes(data.collegeCodes) as CollegeCode[]
    const vis =
      (data.visibility as AnnouncementVisibility | undefined) ??
      inferLegacyVisibility(data.targetRole as string | undefined)

    const ann: Announcement = {
      id: d.id,
      title: String(data.title ?? ''),
      content: String(data.content ?? ''),
      imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
      targetRole: String(data.targetRole ?? 'all') as Announcement['targetRole'],
      createdBy: String(data.createdBy ?? ''),
      createdByName: String(data.createdByName ?? 'Unknown'),
      createdAt,
      publisherRole: data.publisherRole as Announcement['publisherRole'],
      visibility: vis,
      collegeCodes: collegeCodes.length ? collegeCodes : undefined,
    }
    ann.audienceLabel = formatAnnouncementAudienceLabel(ann)
    return ann
  })
}