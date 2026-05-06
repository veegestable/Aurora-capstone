import { Timestamp, addDoc, collection } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface CreateNoteInput {
  counselorId: string
  studentId: string
  note: string
}

export async function createNote(input: CreateNoteInput): Promise<string> {
  const now = Timestamp.now()

  const ref = await addDoc(collection(db, 'counselor_notes'), {
    counselorId: input.counselorId,
    studentId: input.studentId,
    note: input.note.trim(),
    createdAt: now,
    updatedAt: now,
  })

  return ref.id
}