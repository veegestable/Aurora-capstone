import type { Timestamp } from 'firebase/firestore'

export type ContextCategoryKey = 'school' | 'health' | 'social' | 'fun' | 'productivity'
export type SleepQuality = 'poor' | 'fair' | 'good'

/** Firestore document shape in moodLogs/{uid}/entries */
export interface MoodLogEntryDoc {
  mood: string
  intensity: number
  stress: number
  energy: number
  sleepQuality: SleepQuality
  timestamp: Timestamp
  color: string
  dayKey: string
  eventCategories?: ContextCategoryKey[]
  eventTags?: string[]
}

/** Client-side row (Date instead of Timestamp) */
export type MoodLogEntryRow = Omit<MoodLogEntryDoc, 'timestamp'> & {
  id: string
  timestamp: Date
}