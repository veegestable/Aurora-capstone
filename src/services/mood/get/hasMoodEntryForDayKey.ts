import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export const hasMoodEntryForDayKey = async (
  userId: string, 
  dayKey: string
): Promise<boolean> => {
  const q =query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}