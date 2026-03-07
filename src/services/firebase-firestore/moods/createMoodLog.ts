import { collection, addDoc, Timestamp } from '../db'
import { db } from '../db'
import { MoodData } from '../types'

export const createMoodLog = async (moodData: Omit<MoodData, 'user_id'>, userId: string) => {
  try {
    const docData = {
      ...moodData,
      user_id: userId,
      log_date: Timestamp.fromDate(moodData.log_date),
      created_at: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, 'mood_logs'), docData)
    console.log('✅ Mood log created with ID:', docRef.id)
    return { id: docRef.id, ...docData }
  } catch (error: any) {
    console.error('❌ Error creating mood log:', error)
    throw error
  }
}
