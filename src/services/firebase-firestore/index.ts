import { createSchedule } from './schedules/createSchedule'
import { getSchedules } from './schedules/getSchedules'
import { updateSchedule } from './schedules/updateSchedule'
import { deleteSchedule } from './schedules/deleteSchedule'

import { createNotification } from './notifications/createNotification'
import { getNotifications } from './notifications/getNotifications'
import { markNotificationAsRead } from './notifications/markNotificationAsRead'

export * from './types'

export const firestoreService = {
  // Schedules
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  
  // Notifications
  createNotification,
  getNotifications,
  markNotificationAsRead
}