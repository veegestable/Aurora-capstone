import { collection, addDoc, Timestamp } from '../db'
import { db } from '../db'
import { ScheduleData } from '../types'

export const createSchedule = async (scheduleData: Omit<ScheduleData, 'user_id'>, userId: string) => {
  try {
    const docData = {
      ...scheduleData,
      user_id: userId,
      event_date: Timestamp.fromDate(scheduleData.event_date),
      created_at: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, 'schedules'), docData)
    console.log('✅ Schedule created with ID:', docRef.id)
    return { id: docRef.id, ...docData }
  } catch (error: any) {
    console.error('❌ Error creating schedule:', error)
    throw error
  }
}
