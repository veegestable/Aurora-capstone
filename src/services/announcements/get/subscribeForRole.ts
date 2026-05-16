import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsForRole, MOCK_ANNOUNCEMENTS } from '../helpers'
import { listForRole } from './listForRole'

/**
 * Live subscription of announcements visible to a role + college.
 * Returns an unsubscribe function. Falls back to a one-shot fetch (or mocks)
 * on error so the UI always has something to render.
 */
export function subscribeForRole(
  role: 'counselor' | 'student',
  viewerCollegeCode: string | undefined,
  maxCount: number,
  onNext: (list: Announcement[]) => void,
  onError?: (error: Error) => void,
  viewerUserId?: string,
): () => void {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const list = mapAnnouncementsForRole(snapshot.docs, role, viewerCollegeCode, maxCount, viewerUserId)
      onNext(list.length > 0 ? list : MOCK_ANNOUNCEMENTS)
    },
    (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      void listForRole(role, viewerCollegeCode, maxCount, viewerUserId)
        .then(onNext)
        .catch(() => onNext(MOCK_ANNOUNCEMENTS))
    },
  )
}