import { firestoreService } from '../../firebase-firestore'
import { Timestamp } from 'firebase/firestore'
import { NotificationResponse } from '../types'

export const createNotification = async (data: {
  userId: string
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message'
  message: string
  scheduled_for: string
}): Promise<NotificationResponse> => {
  try {
    const result = await firestoreService.createNotification({
      type: data.type,
      message: data.message,
      status: 'pending',
      scheduled_for: new Date(data.scheduled_for)
    }, data.userId)

    const scheduledFor = result.scheduled_for instanceof Timestamp ? result.scheduled_for.toDate() : new Date(result.scheduled_for)
    const createdAt = result.created_at instanceof Timestamp ? result.created_at.toDate() : new Date(result.created_at)

    return {
      id: result.id,
      type: result.type,
      message: result.message,
      status: result.status,
      scheduled_for: scheduledFor.toISOString(),
      created_at: createdAt.toISOString()
    } as NotificationResponse
  } catch (error) {
    console.error('Create notification error:', error)
    throw error
  }
}