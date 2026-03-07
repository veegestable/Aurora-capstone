import { collection, query, where, orderBy, getDocs } from '../db'
import { db } from '../db'
import { NotificationData } from '../types'

export const getNotifications = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const notifications = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        user_id: data.user_id,
        type: data.type,
        message: data.message,
        status: data.status,
        scheduled_for: data.scheduled_for?.toDate() || new Date(),
        created_at: data.created_at?.toDate() || new Date()
      } as NotificationData & { id: string; created_at: Date }
    })

    console.log('✅ Retrieved', notifications.length, 'notifications')
    return notifications
  } catch (error: any) {
    console.error('❌ Error getting notifications:', error)
    throw error
  }
}
