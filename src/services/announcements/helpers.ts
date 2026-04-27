import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { Announcement } from '../../types/announcement.types'

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
  },
]

/** Map Firestore docs -> Announcements, filtering by target role + 3-week TTL. */
export function mapAnnouncementsForRole(
  docs: QueryDocumentSnapshot[],
  role: 'counselor' | 'student',
  maxCount: number
): Announcement[] {
  const now = Date.now()
  const list = docs
    .map((d) => {
      const data = d.data()
      const target = (data.targetRole ?? 'all') as Announcement['targetRole']
      const allowed = target === 'all' || target === role
      if (!allowed) return null

      const createdAt: Date = data.createdAt?.toDate?.() ?? new Date()
      if (now - createdAt.getTime() > THREE_WEEKS_MS) return null

      const announcement: Announcement = {
        id: d.id,
        title: data.title ?? '',
        content: data.content ?? '',
        imageUrl: data.imageUrl ?? undefined,
        targetRole: target,
        createdBy: data.createdBy ?? '',
        createdByName: data.createdByName ?? '',
        createdAt,
      }
      return announcement
    })
    .filter((x): x is Announcement => x !== null)

  return list.slice(0, maxCount)
}

/** Map Firestore docs -> Announcements with NO filters. Admin view. */
export function mapAnnouncementsAll(docs: QueryDocumentSnapshot[]): Announcement[] {
  return docs.map((d) => {
    const data = d.data()
    const createdAt: Date = data.createdAt?.toDate?.() ?? new Date()

    return {
      id: d.id,
      title: data.title ?? '',
      content: data.content ?? '',
      imageUrl: data.imageUrl ?? undefined,
      targetRole: (data.targetRole ?? 'all') as Announcement['targetRole'],
      createdBy: data.createdBy ?? '',
      createdByName: data.createdByName ?? '',
      createdAt,
    }
  })
}