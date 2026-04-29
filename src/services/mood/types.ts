import type { Timestamp } from 'firebase/firestore'

export type ContextCategoryKey = 'school' | 'health' | 'social' | 'fun' | 'productivity'
export type SleepQuality = 'poor' | 'fair' | 'good'

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
  notes?: string
  journalSource?: 'auto' | 'manual'
}

export type MoodLogEntryRow = Omit<MoodLogEntryDoc, 'timestamp'> & {
  id: string
  timestamp: Date
}