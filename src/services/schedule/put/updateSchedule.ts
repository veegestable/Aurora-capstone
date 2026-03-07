import { firestoreService } from '../../firebase-firestore'
import { ScheduleData } from '../types'

export const updateSchedule = async (scheduleId: string, data: Partial<ScheduleData>) => {
  try {
    console.log('🔥 Updating schedule: ', scheduleId)

    const updateData: any = { ...data }

    if (data.event_date) updateData.event_date = new Date(data.event_date)

    await firestoreService.updateSchedule(scheduleId, updateData)

    console.log('✅ Schedule updated successfully')

    return {
      id: scheduleId,
      ...data
    }
  } catch (error) {
    console.error('❌ Error updating schedule: ', error)
    throw error
  }
}