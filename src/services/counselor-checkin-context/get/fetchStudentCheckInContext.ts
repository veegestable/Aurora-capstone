import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { firestoreService } from '../../firebase-firestore'
import { moodV2Service } from '../../mood-v2'
import { counselorCheckInWindowStart } from '../../../constants/counselor/counselor-checkin-policy'

export interface CheckInContextResult {
  sharingEnabled: boolean
  logs: Array<{
    stress_level?: number
    energy_level?: number
    log_date?: Date
  }>
}

/**
 * Fetch a student's check-in context for counselor view.
 * Checks whether the student has opten in to sharing, then fetches
 * recent mood logs within the policy window.
 */
export const fetchStudentCheckInContext = async (studentId: string): Promise<CheckInContextResult> => {
  // 1. Check if student has sharing enabled in userSettings
  const settingsRef = doc(db, 'userSettings', studentId)
  const settingsSnap = await getDoc(settingsRef)
  const sharingEnabled = settingsSnap.exists()
    ? settingsSnap.data()?.shareCheckInsWithGuidance === true
    : false

  if (!sharingEnabled) {
    return {
      sharingEnabled: false,
      logs: []
    }
  }

  // 2. Fetch mood logs within the policy window
  const windowStart = counselorCheckInWindowStart()
  const now = new Date()

  try {
    const [legacyLogs, v2Entries] = await Promise.all([
      firestoreService.getMoodLogs(studentId, windowStart, now),
      moodV2Service.getMoodLogEntries(studentId, windowStart, now)
    ])

    const v2Mapped = v2Entries.map((e) => ({
      stress_level: Math.min(10, Math.max(1, e.stress * 2)),
      log_date: e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)
    }))

    const legacyMapped = legacyLogs.map((l) => ({
      stress_level: typeof l.stress_level === 'number' ? l.stress_level : undefined,
      energy_level: typeof l.energy_level === 'number' ? l.energy_level : undefined,
      log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date as string)
    }))

    // Merge and sort newest first
    const allLogs = [...legacyMapped, ...v2Mapped].sort((a, b) => {
      const ta = a.log_date?.getTime() ?? 0
      const tb = b.log_date?.getTime() ?? 0
      return tb - ta
    })

    return { sharingEnabled: true, logs: allLogs }
  } catch (error) {
    console.error('❌ Failed to fetch check-in context for student:', studentId, error)
    return { sharingEnabled: true, logs: [] }
  }
}