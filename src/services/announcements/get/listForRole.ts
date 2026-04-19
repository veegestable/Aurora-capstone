import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsForRole, MOCK_ANNOUNCEMENTS } from '../helpers'

/**
 * One-shot fetch of announcements visible to a role.
 * Applies target-role and 3-week TTL filters. Fall back to MOCK_ANNOUNCEMENTS
 * when the collection is empty or unreachable so the UI never looks broken.
 */
export async function listForRole(
  role: 'counselor' | 'student',
  maxCount = 20
): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    )
    const snapshot = await getDocs(q)
    const list = mapAnnouncementsForRole(snapshot.docs, role, maxCount)
    return list.length > 0 ? list : MOCK_ANNOUNCEMENTS
  } catch (error) {
    console.error('Error listing announcements for role:', error)
    return MOCK_ANNOUNCEMENTS
  }
}