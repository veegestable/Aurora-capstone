import { collection, query, where, orderBy, getDocs, Timestamp } from '../db'
import { db } from '../db'
import { MoodData } from '../types'

export const getMoodLogs = async (userId: string, startDate?: Date, endDate?: Date) => {
  try {
    let q = query(
      collection(db, 'mood_logs'),
      where('user_id', '==', userId),
      orderBy('log_date', 'desc')
    )

    if (startDate) {
      q = query(q, where('log_date', '>=', Timestamp.fromDate(startDate)))
    }
    if (endDate) {
      q = query(q, where('log_date', '<=', Timestamp.fromDate(endDate)))
    }

    const querySnapshot = await getDocs(q)
    const moodLogs = querySnapshot.docs.map(doc => {
      const data = doc.data()

      return {
        id: doc.id,
        user_id: data.user_id,
        emotions: data.emotions || [],
        notes: data.notes || '',
        log_date: data.log_date?.toDate() || new Date(),
        energy_level: data.energy_level || 5,
        stress_level: data.stress_level || 3,
        detection_method: data.detection_method || 'manual',
        created_at: data.created_at?.toDate() || new Date()
      } as MoodData & { id: string; created_at: Date; log_date: Date }
    })

    console.log('✅ Retrieved', moodLogs.length, 'mood logs')
    return moodLogs
  } catch (error: any) {
    console.error('❌ Error getting mood logs:', error)
    throw error
  }
}