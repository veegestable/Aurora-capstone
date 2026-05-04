import { Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface UpdateSessionNoteInput {
  noteId: string
  note: string
}

export async function updateSessionNote(input: UpdateSessionNoteInput): Promise<void> {
  await updateDoc(doc(db, 'session_notes', input.noteId), {
    note: input.note.trim(),
    updatedAt: Timestamp.now()
  })
}