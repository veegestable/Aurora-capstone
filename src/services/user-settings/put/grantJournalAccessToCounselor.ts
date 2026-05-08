import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

/**
 * Set userSettings/{studentId}.counselorJournalAccess[counselorId] = true.
 * Idempotent — safe to call from session creation/confirmation flows.
 */
export const grantJournalAccessToCounselor = async (
  studentId: string,
  counselorId: string,
): Promise<void> => {
  if (!studentId || !counselorId) return
  const ref = doc(db, 'userSettings', studentId)
  const snap = await getDoc(ref)
  const fieldKey = `counselorJournalAccess.${counselorId}`
  if (snap.exists()) {
    await updateDoc(ref, { [fieldKey]: true })
  } else {
    await setDoc(ref, {
      counselorJournalAccess: { [counselorId]: true },
      createdAt: new Date().toISOString(),
    })
  }
}