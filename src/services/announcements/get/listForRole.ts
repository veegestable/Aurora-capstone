import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsForRole, MOCK_ANNOUNCEMENTS } from '../helpers'

/**
 * One-shot fetch of announcements visible to a role + college.
 * Applies audience filter and 3-week TTL. Falls back to MOCK_ANNOUNCEMENTS
 * when the collection is empty or unreachable.
 */
export async function listForRole(
  role: 'counselor' | 'student',
  viewerCollegeCode: string | undefined,
  maxCount = 20,
  viewerUserId?: string,
): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(maxCount),
    )
    const snapshot = await getDocs(q)
    const list = mapAnnouncementsForRole(snapshot.docs, role, viewerCollegeCode, maxCount, viewerUserId)
    return list.length > 0 ? list : MOCK_ANNOUNCEMENTS
  } catch (error) {
    console.error('Error listing announcements for role:', error)
    return MOCK_ANNOUNCEMENTS
  }
}