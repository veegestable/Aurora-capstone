import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'

/** Hides the thread from this counselor's Messages list only (mobile parity). */
export async function counselorArchiveConversation(
  counselorId: string,
  conversationId: string,
): Promise<void> {
  const uid = auth.currentUser?.uid ?? ''
  if (uid && uid !== counselorId) {
    throw new Error('Only the counselor can archive their inbox view.')
  }
  const docId = `conv_arch__${conversationId}`
  await setDoc(
    doc(db, 'users', counselorId, 'private', docId),
    { archivedAt: Timestamp.now() },
    { merge: true },
  )
}
