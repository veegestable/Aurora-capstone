import { collection, getCountFromServer } from 'firebase/firestore'
import { db } from '../../../config/firebase'

/** Total documents in `announcements` (admin dashboard stats). */
export async function countAll(): Promise<number | null> {
  try {
    const snap = await getCountFromServer(collection(db, 'announcements'))
    return snap.data().count
  } catch {
    return null
  }
}
