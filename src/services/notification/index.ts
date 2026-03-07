import { getNotifications } from './get/getNotifications'
import { getUnreadCount } from './get/getUnreadCount'
import { markAsRead } from './put/markAsRead'
import { createNotification } from './post/createNotification'

export * from './types'

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  createNotification
}