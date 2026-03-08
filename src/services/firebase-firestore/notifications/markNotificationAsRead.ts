import { doc, updateDoc, Timestamp } from '../db'
import { db } from '../db'

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId)
    await updateDoc(notificationRef, {
      status: 'read',
      updated_at: Timestamp.now()
    })
    console.log('✅ Notification marked as read')
  } catch (error: any) {
    console.error('❌ Error marking notification as read:', error)
    throw error
  }
}
