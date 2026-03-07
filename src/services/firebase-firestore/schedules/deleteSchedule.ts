import { doc, deleteDoc } from '../db'
import { db } from '../db'

export const deleteSchedule = async (scheduleId: string) => {
  try {
    await deleteDoc(doc(db, 'schedules', scheduleId))

    console.log('✅ Schedule deleted')
  } catch (error: any) {
    console.error('❌ Error deleting schedule: ', error)
    throw error
  }
}