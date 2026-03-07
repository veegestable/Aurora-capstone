import { doc, updateDoc, Timestamp } from '../db'
import { db } from '../db'
import { ScheduleData } from '../types'

export const updateSchedule = async (scheduleId: string, updateData: Partial<ScheduleData>) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId)

    const updatePayload: any = {
      ...updateData,
      updated_at: Timestamp.now()
    }

    if (updateData.event_date) {
      updatePayload.event_date = Timestamp.fromDate(updateData.event_date)
    }

    await updateDoc(scheduleRef, updatePayload)
    console.log('✅ Schedule updated')
    return { id: scheduleId, ...updatePayload }
  } catch (error: any) {
    console.error('❌ Error updating schedule:', error)
    throw error
  }
}