import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsAll } from '../helpers'

/** Live admin subscription for all announcements. */
export function subscribeAll(
  onNext: (list: Announcement[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => onNext(mapAnnouncementsAll(snapshot.docs)),
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  )
}