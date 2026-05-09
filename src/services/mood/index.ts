import { getMoodLogs } from "./get/getMoodLogs"
import { hasMoodEntryForDayKey } from "./get/hasMoodEntryForDayKey"
import { hasBathEntryForDayKey } from "./get/hasBathEntryForDayKey"
import {
  getMealsAnsweredForDayKey,
  getMealsTakenLockedForDayKey,
} from "./get/hasMealEntryForDayKey"
import { createMoodLog } from "./post/createMoodLog"

export * from './types'

export const moodService = {
  getMoodLogs,
  hasMoodEntryForDayKey,
  hasBathEntryForDayKey,
  getMealsAnsweredForDayKey,
  getMealsTakenLockedForDayKey,
  createMoodLog
}