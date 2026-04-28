import { collection, query, where, orderBy, getDocs, Timestamp, onSnapshot, type QueryConstraint } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { MoodLogEntryDoc, MoodLogEntryRow } from '../../../types/mood-v2.types'

function buildQuery(
  userId: string, 
  startDate?: Date,
  endDate?: Date
) {
  const col = collection(db, 'moodLogs', userId, 'entries')
  const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')]

  if (startDate) constraints.unshift(where('timestamp', '>=', Timestamp.fromDate(startDate)))
  if (endDate) constraints.unshift(where('timestamp', '<=', Timestamp.fromDate(endDate)))

  return query(col, ...constraints)
}

function docToRow(
  id: string,
  data: MoodLogEntryDoc
): MoodLogEntryRow {
  return {
    id,
    mood: data.mood,
    intensity: data.intensity,
    stress: data.stress,
    energy: data.energy,
    sleepQuality: data.sleepQuality,
    color: data.color,
    dayKey: data.dayKey,
    eventCategories: data.eventCategories ?? [],
    eventTags: data.eventTags ?? [],
    timestamp: data.timestamp?.toDate?.() ?? new Date()
  }
}

export const getMoodLogEntries = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<MoodLogEntryRow[]> => {
  const snap = await getDocs(buildQuery(userId, startDate, endDate))

  return snap.docs.map((d) => docToRow(d.id, d.data() as MoodLogEntryDoc))
}

/** Real-time listener for v2 mood entries. Returns an unsubscribe function. */
export const subscribeMoodLogEntries = (
  userId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  onNext: (entries: MoodLogEntryRow[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  return onSnapshot(
    buildQuery(userId, startDate, endDate),
    (snap) => onNext(snap.docs.map((d) => docToRow(d.id, d.data() as MoodLogEntryDoc))),
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}