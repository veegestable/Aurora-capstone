import { Timestamp, addDoc, collection } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface CreateSessionNoteInput {
  sessionId: string
  counselorId: string
  note: string
}

export async function createSessionNote(input: CreateSessionNoteInput): Promise<string> {
  const ref = await addDoc(collection(db, 'session_notes'), {
    sessionId: input.sessionId,
    counselorId: input.counselorId,
    note: input.note.trim(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })

  return ref.id
}