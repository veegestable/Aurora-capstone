import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from  '../../../config/firebase'

/** Check if a v2 mood entry already exists for a given dayKey. */
export const hasMoodEntryForDayKey = async (
  userId: string,
  dayKey: string,
): Promise<boolean> => {
  const q = query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}