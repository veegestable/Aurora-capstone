import { Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface UpdateNoteInput {
  noteId: string
  note: string
}

export async function updateNote(input: UpdateNoteInput): Promise<void> {
  await updateDoc(doc(db, 'counselor_notes', input.noteId), {
    note: input.note.trim(),
    updatedAt: Timestamp.now(),
  })
}