import { firestoreService } from "../../firebase-firestore"
import { MoodDataInput } from '../types'

export const updateMoodLog = async (
  logId: string, 
  moodData: Partial<MoodDataInput>
) => {
  try {
    console.log('🔥 Updating mood log:', logId)

    const updatedLog = await firestoreService.updateMoodLog(logId, {
      emotions: moodData.emotions,
      notes: moodData.notes,
      energy_level: moodData.energy_level,
      stress_level: moodData.stress_level,
      detection_method: moodData.detection_method
    })

    console.log('✅ Mood log updated successfully')
    return updatedLog
  } catch (error) {
    console.error('❌ Update mood log error:', error)
    throw error
  }
}