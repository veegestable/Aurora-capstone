import { doc, updateDoc, Timestamp } from '../db'
import { db } from '../db'
import { MoodData } from '../types'

export const updateMoodLog = async (logId: string, updateData: Partial<MoodData>) => {
  try {
    const logRef = doc(db, 'mood_logs', logId)

    const updatePayload: any = {
      ...updateData,
      updated_at: Timestamp.now()
    }

    if (updateData.log_date) {
      updatePayload.log_date = Timestamp.fromDate(updateData.log_date)
    }

    await updateDoc(logRef, updatePayload)
    console.log('✅ Mood log updated')
    return { id: logId, ...updatePayload }
  } catch (error: any) {
    console.error('❌ Error updating mood log:', error)
    throw error
  }
}