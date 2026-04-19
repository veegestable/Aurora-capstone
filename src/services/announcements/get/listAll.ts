import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Announcement } from '../../../types/announcement.types'
import { mapAnnouncementsAll } from '../helpers'

/** Admin view: every announcement, no TTL or role filter, newest first. */
export async function listAll(): Promise<Announcement[]> {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return mapAnnouncementsAll(snapshot.docs)
}