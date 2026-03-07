import { firestoreService } from '../../firebase-firestore'

export const deleteSchedule = async (scheduleId: string) => {
  try {
    console.log('🔥 Deleting schedule:', scheduleId)
    
    await firestoreService.deleteSchedule(scheduleId)
    
    console.log('✅ Schedule deleted successfully')
    return { message: 'Schedule deleted successfully' }
  } catch (error) {
    console.error('❌ Error deleting schedule:', error)
    throw error
  }
}
