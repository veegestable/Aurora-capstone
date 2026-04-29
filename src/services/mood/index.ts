import { getMoodLogs } from "./get/getMoodLogs"
import { hasMoodEntryForDayKey } from "./get/hasMoodEntryForDayKey"
import { createMoodLog } from "./post/createMoodLog"

export * from './types'

export const moodService = {
  getMoodLogs,
  hasMoodEntryForDayKey,
  createMoodLog
}