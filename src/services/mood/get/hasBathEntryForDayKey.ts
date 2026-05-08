import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'

/**
 * Returns true if the user already logged a mood entry today where they confirmed
 * they bathed and are not stinky lmao. 
 * Used to disable the Bath chip once a positive answer was recorded.
 */
export const hasBathEntryForDayKey = async (
  userId: string,
  dayKey: string
): Promise<boolean> => {
  const q = query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey),
    where('bathTaken', '==', true),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}