import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

/** Restores the thread to the counselor inbox (no-op if not archived). */
export async function counselorClearInboxArchive(
  counselorId: string,
  conversationId: string,
): Promise<void> {
  const docId = `conv_arch__${conversationId}`
  await deleteDoc(doc(db, 'users', counselorId, 'private', docId)).catch(() => {})
}
