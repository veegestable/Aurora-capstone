import { collection, collectionGroup, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export interface SchoolAnalytics {
  activeStudents: number
  avgStress: number
  avgEnergy: number
  totalCheckIns30d: number
  totalCheckInsAllTime: number
}

interface MoodEntryDoc {
  stress?: number
  energy?: number
  timestamp?: Timestamp
}

export async function getSchoolAnalytics(): Promise<SchoolAnalytics> {
  // Active students
  const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')))
  const activeStudents = studentsSnap.size

  // 30-day check-ins + avg stress/energy
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const mood30Snap = await getDocs(query(
    collectionGroup(db, 'entries'),
    where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
  ))

  let stressSum = 0
  let stressCount = 0
  let energySum = 0
  let energyCount = 0

  mood30Snap.docs.forEach((d) => {
    const x = d.data() as MoodEntryDoc
    if (typeof x.stress === 'number') {
      stressSum += x.stress
      stressCount += 1
    }
    if (typeof x.energy === 'number') {
      energySum += x.energy
      energyCount += 1
    }
  })

  // All-time total check-ins
  const moodAllSnap = await getDocs(collectionGroup(db, 'entries'))

  return {
    activeStudents,
    avgStress: stressCount ? stressSum / stressCount : 0,
    avgEnergy: energyCount ? energySum / energyCount : 0,
    totalCheckIns30d: mood30Snap.size,
    totalCheckInsAllTime: moodAllSnap.size,
  }
}