import { collection, addDoc, Timestamp } from '../db'
import { db } from '../db'
import { NotificationData } from '../types'

export const createNotification = async (notificationData: Omit<NotificationData, 'user_id'>, userId: string) => {
  try {
    const docData = {
      ...notificationData,
      user_id: userId,
      scheduled_for: Timestamp.fromDate(notificationData.scheduled_for),
      created_at: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, 'notifications'), docData)
    console.log('✅ Notification created with ID:', docRef.id)
    return { id: docRef.id, ...docData }
  } catch (error: any) {
    console.error('❌ Error creating notification:', error)
    throw error
  }
}
