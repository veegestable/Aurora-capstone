import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { MoodLogEntryRow, MoodLogEntryDoc } from '../types'

export const getMoodLogs = async (
  userId: string,
  startDate?: string | Date,
  endDate?: string | Date,
): Promise<MoodLogEntryRow[]> => {
  try {
    const col = collection(db, 'moodLogs', userId, 'entries')
    let q = query(col, orderBy('timestamp', 'desc'))

    if (startDate && endDate) {
      const startObj = startDate instanceof Date ? startDate : new Date(startDate)
      const endObj = endDate instanceof Date ? endDate : new Date(endDate)
      q = query(
        col,
        where('timestamp', '>=', Timestamp.fromDate(startObj)),
        where('timestamp', '<=', Timestamp.fromDate(endObj)),
        orderBy('timestamp', 'desc')
      )
    } else if (startDate) {
      const startObj = startDate instanceof Date ? startDate : new Date(startDate)
      q = query(col, where('timestamp', '>=', Timestamp.fromDate(startObj)), orderBy('timestamp', 'desc'))
    } else if (endDate) {
      const endObj = endDate instanceof Date ? endDate : new Date(endDate)
      q = query(col, where('timestamp', '<=', Timestamp.fromDate(endObj)), orderBy('timestamp', 'desc'))
    }

    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const x = d.data() as MoodLogEntryDoc
      return {
        id: d.id,
        ...x,
        timestamp: x.timestamp?.toDate?.() ?? new Date(),
      }
    })
  } catch (error) {
    console.error('❌ Get mood logs error:', error)
    throw error
  }
}