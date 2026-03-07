import { getMoodLogs } from "./get/getMoodLogs"
import { getTodayMoodLog } from "./get/getTodayMoodLog"
import { createMoodLog } from "./post/createMoodLog"
import { updateMoodLog } from "./put/updateMoodLog"

export * from './types'

export const moodService = {
  getMoodLogs,
  getTodayMoodLog,
  createMoodLog,
  updateMoodLog
}