import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function deleteSessionNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'session_notes', noteId))
}