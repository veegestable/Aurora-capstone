import { type ScheduleData, firestoreService } from '../../firebase-firestore'
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
    const formattedSchedules = schedules.map((schedule) => {
      const s = schedule as ScheduleData & { id: string; event_date: Date; created_at?: Date }
      return {
        id: s.id,
        title: s.title || '',
        description: s.description || '',
        event_date: s.event_date instanceof Date 
          ? s.event_date.toISOString() 
          : new Date((s.event_date as unknown as { toDate: () => Date }).toDate()).toISOString(),
        event_type: s.event_type
      }
    })
    
    console.log('✅ Schedules fetched:', formattedSchedules.length, 'entries')
    return formattedSchedules
  } catch (error) {
    console.error('❌ Error fetching schedules:', error)
    throw error
  }
}
