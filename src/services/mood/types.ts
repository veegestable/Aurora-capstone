import type { Timestamp } from 'firebase/firestore'

export type ContextCategoryKey = 'school' | 'health' | 'social' | 'fun' | 'productivity'
export type SleepQuality = 'poor' | 'fair' | 'good'
export type DetectionMethod = 'manual' | 'selfie_ai'

export interface MealResponse {
  mealId: string
  mealLabel: string
  mealTime: string // HH:mm
  taken: boolean
}

export interface MoodLogEntryDoc {
  mood: string
  intensity: number
  /** How long the user reports the mood lasted, in minutes. Defaults to 60. */
  durationMinutes: number
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
  detectionMethod?: DetectionMethod
  /** True when the student confirmed they bathed today. */
  bathTaken?: boolean
  /** Per-meal taken/missed responses, derived from the user's meal schedule. */
  mealResponses?: MealResponse[]
  /** Optional Firebase Storage URL of the photo attached to the entry. */
  journalImageUrl?: string
}

export type MoodLogEntryRow = Omit<MoodLogEntryDoc, 'timestamp'> & {
  id: string
  timestamp: Date
}