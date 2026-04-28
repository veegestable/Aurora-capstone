import { getMoodLogEntries, subscribeMoodLogEntries } from './get/getMoodLogEntries'
import { hasMoodEntryForDayKey } from './get/hasMoodEntryForDayKey'
import { createMoodLogEntry } from './post/createMoodLogEntry'

export const moodV2Service = {
  getMoodLogEntries,
  subscribeMoodLogEntries,
  hasMoodEntryForDayKey,
  createMoodLogEntry,
}