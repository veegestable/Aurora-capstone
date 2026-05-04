import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function deleteNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'counselor_notes', noteId))
}