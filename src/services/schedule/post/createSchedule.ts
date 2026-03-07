import { firestoreService } from '../../firebase-firestore'
import { auth } from '../../../config/firebase'
import { ScheduleData, ScheduleResponse } from '../types'

export const createSchedule = async (_userId: string, data: ScheduleData): Promise<ScheduleResponse> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    console.log('🔥 Creating schedule for user:', user.uid)
    
    const schedule = await firestoreService.createSchedule({
      title: data.title || '',
      description: data.description || '',
      event_date: new Date(data.event_date),
      event_type: data.event_type
    }, user.uid)
    
    console.log('✅ Schedule created successfully')
    return {
      id: schedule.id,
      title: data.title || '',
      description: data.description || '',
      event_date: data.event_date,
      event_type: data.event_type
    }
  } catch (error) {
    console.error('❌ Error creating schedule:', error)
    throw error
  }
}
