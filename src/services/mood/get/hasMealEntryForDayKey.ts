import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { MoodLogEntryDoc } from '../types'

export const getMealsAnsweredForDayKey = async (
  userId: string,
  dayKey: string
): Promise<Set<string>> => {
  const q = query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey)
  )
  const snap = await getDocs(q)
  const answered = new Set<string>()

  snap.docs.forEach((d) => {
    const data = d.data() as Pick<MoodLogEntryDoc, 'mealResponses'>
    data.mealResponses?.forEach((m) => {
      if (m.mealId) answered.add(m.mealId)
    })
  })

  return answered
}

/** Meal ids the student logged as Taken today — those stay locked like bath; "Not yet" can be changed later. */
export const getMealsTakenLockedForDayKey = async (
  userId: string,
  dayKey: string
): Promise<Set<string>> => {
  const q = query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey)
  )
  const snap = await getDocs(q)
  const locked = new Set<string>()

  snap.docs.forEach((d) => {
    const data = d.data() as Pick<MoodLogEntryDoc, 'mealResponses'>
    data.mealResponses?.forEach((m) => {
      if (m.mealId && m.taken === true) locked.add(m.mealId)
    })
  })

  return locked
}