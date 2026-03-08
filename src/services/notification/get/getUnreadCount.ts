import { firestoreService } from '../../firebase-firestore'

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const notifications = await firestoreService.getNotifications(userId)
    return notifications.filter((n: any) => n.status !== 'read').length
  } catch (error) {
    console.error('Get unread count error:', error)
    return 0
  }
}
