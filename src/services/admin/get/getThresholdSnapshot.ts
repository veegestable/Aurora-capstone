import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export interface ThresholdSnapshot {
  nlpThreshold: number
  lowMoodDays: number
}

export async function getThresholdSnapshot(): Promise<ThresholdSnapshot> {
  // Uses existing admin settings concept; safe fallback if doc not crreated yet.
  const ref = doc(db, 'adminSettings', 'thresholdSnapshot')
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    return {
      nlpThreshold: 0.85,
      lowMoodDays: 3
    }
  }

  const data = snap.data() as Partial<ThresholdSnapshot>
  return {
    nlpThreshold: typeof data.nlpThreshold === 'number' ? data.nlpThreshold : 0.85,
    lowMoodDays: typeof data.lowMoodDays === 'number' ? data.lowMoodDays : 3
  }
}