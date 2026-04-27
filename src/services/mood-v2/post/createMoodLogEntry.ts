import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { MoodLogEntryDoc } from '../../../types/mood-v2.types'

/** Create a v2 mood log entry in moodLogs/{userId}/entries. */
export const createMoodLogEntry = async (
  userId: string,
  entry: Omit<MoodLogEntryDoc, 'timestamp'> & { timestamp: Date }
) => {
  const col = collection(db, 'moodLogs', userId, 'entries')
  const payload: MoodLogEntryDoc = {
    mood: entry.mood,
    intensity: entry.intensity,
    stress: entry.stress,
    energy: entry.energy,
    sleepQuality: entry.sleepQuality,
    color: entry.color,
    dayKey: entry.dayKey,
    eventCategories: entry.eventCategories ?? [],
    eventTags: entry.eventTags ?? [],
    timestamp: Timestamp.fromDate(entry.timestamp),
  }

  const docRef = await addDoc(col, payload)
  console.log('✅ V2 mood log entry created:', docRef.id)

  return { id: docRef.id, ...entry }
}