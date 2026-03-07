import { firestoreService } from '../../firebase-firestore'

export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    await firestoreService.markNotificationAsRead(notificationId)
  } catch (error) {
    console.error('Mark as read error:', error)
    throw error
  }
}