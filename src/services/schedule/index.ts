import { getSchedules } from './get/getSchedules'
import { createSchedule } from './post/createSchedule'
import { updateSchedule } from './put/updateSchedule'
import { deleteSchedule } from './delete/deleteSchedule'

export * from './types'

export const scheduleService = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
}