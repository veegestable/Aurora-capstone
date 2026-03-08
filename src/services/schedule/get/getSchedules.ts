import { firestoreService } from '../../firebase-firestore'
import { auth } from '../../../config/firebase'

export const getSchedules = async (_userId?: string, startDate?: string, endDate?: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    console.log('🔥 Fetching schedules for user:', user.uid)
    
    const startDateObj = startDate ? new Date(startDate) : undefined
    const endDateObj = endDate ? new Date(endDate) : undefined
    
    const schedules = await firestoreService.getSchedules(
      user.uid, 
      startDateObj, 
      endDateObj
    )
    
    // Convert schedules to expected format
    const formattedSchedules = schedules.map((schedule: any) => ({
      id: schedule.id,
      title: schedule.title || '',
      description: schedule.description || '',
      event_date: schedule.event_date instanceof Date 
        ? schedule.event_date.toISOString() 
        : new Date(schedule.event_date.toDate()).toISOString(),
      event_type: schedule.event_type
    }))
    
    console.log('✅ Schedules fetched:', formattedSchedules.length, 'entries')
    return formattedSchedules
  } catch (error) {
    console.error('❌ Error fetching schedules:', error)
    throw error
  }
}
