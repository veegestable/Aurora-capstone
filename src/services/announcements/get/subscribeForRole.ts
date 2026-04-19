import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsForRole, MOCK_ANNOUNCEMENTS } from '../helpers'
import { listForRole } from './listForRole'

/**
 * Live subscription of announcements visible to a role.
 * Returns an unsubscribe function. Falls back to a one-shot fetch (or mocks)
 * on error so the UI always has something to render.
 * @param role - The role to subscribe to (counselor or student)
 * @param maxCount - The maximum number of announcements to return
 * @param onNext - A callback function that will be called with the list of announcements
 * @param onError - A callback function that will be called if there is an error
 * @returns An unsubscribe function
 */
export function subscribeForRole(
  role: 'counselor' | 'student',
  maxCount: number,
  onNext: (list: Announcement[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const list = mapAnnouncementsForRole(snapshot.docs, role, maxCount)
      onNext(list.length > 0 ? list : MOCK_ANNOUNCEMENTS)
    },
    (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      void listForRole(role, maxCount).then(onNext).catch(() => onNext(MOCK_ANNOUNCEMENTS))
    }
  )
}