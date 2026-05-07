import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function deleteResource(id: string): Promise<void> {
  await deleteDoc(doc(db, 'resources', id))
}