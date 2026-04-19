import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id))
}