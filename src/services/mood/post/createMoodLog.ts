import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { MoodLogEntryDoc } from '../types'

export const createMoodLog = async (
  userId: string,
  entry: Omit<MoodLogEntryDoc, 'timestamp'> & { timestamp: Date }
) => {
  const col = collection(db, 'moodLogs', userId, 'entries')
  const payload: MoodLogEntryDoc = {
    mood: entry.mood,
    intensity: entry.intensity,
    durationMinutes: Math.max(1, Math.round(entry.durationMinutes ?? 60)),
    stress: entry.stress,
    energy: entry.energy,
    sleepQuality: entry.sleepQuality,
    color: entry.color,
    dayKey: entry.dayKey,
    eventCategories: entry.eventCategories ?? [],
    eventTags: entry.eventTags ?? [],
    notes: entry.notes ?? '',
    journalSource: entry.journalSource ?? 'auto',
    detectionMethod: entry.detectionMethod ?? 'manual',
    bathTaken: entry.bathTaken ?? false,
    mealResponses: entry.mealResponses ?? [],
    journalImageUrl: entry.journalImageUrl ?? '',
    timestamp: Timestamp.fromDate(entry.timestamp),
  }

  const docRef = await addDoc(col, payload)
  return { id: docRef.id, ...entry }
}