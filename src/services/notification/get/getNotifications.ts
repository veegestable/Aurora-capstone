import { firestoreService } from '../../firebase-firestore'
import { Timestamp } from 'firebase/firestore'
import { NotificationResponse } from '../types'

export const getNotifications = async (userId: string): Promise<NotificationResponse[]> => {
  try {
    const notifications = await firestoreService.getNotifications(userId)
    return notifications.map((n: any) => {
      // Handle Firestore Timestamp
      const scheduledFor = n.scheduled_for instanceof Timestamp ? n.scheduled_for.toDate() : new Date(n.scheduled_for)
      const createdAt = n.created_at instanceof Timestamp ? n.created_at.toDate() : new Date(n.created_at)

      return {
        id: n.id,
        type: n.type,
        message: n.message,
        status: n.status,
        scheduled_for: scheduledFor.toISOString(),
        created_at: createdAt.toISOString()
      }
    }) as NotificationResponse[]
  } catch (error) {
    console.error('Get notifications error:', error)
    return []
  }
}