import { firestoreService } from '../../firebase-firestore'
import { auth } from '../../../config/firebase'
import { MoodDataInput } from '../types'

export const createMoodLog = async (moodData: MoodDataInput) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
        
    console.log('🔥 Creating mood log for user:', user.uid)

    const moodLog = await firestoreService.createMoodLog({
      emotions: moodData.emotions,
      notes: moodData.notes || '',
      log_date: typeof moodData.log_date === 'string' ? new Date(moodData.log_date) : moodData.log_date,
      energy_level: moodData.energy_level || 5,
      stress_level: moodData.stress_level || 3,
      detection_method: moodData.detection_method || 'manual'
    }, user.uid)

    console.log('✅ Mood log created successfully')
    return moodLog
  } catch (error) {
    console.error('❌ Get today mood log error:', error)
    throw error
  }
}