import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { moodService } from '../../mood'
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
    const v2Entries = await moodService.getMoodLogs(studentId, windowStart, now)

    const mappedLogs = v2Entries.map((e) => ({
      // Map V2 1-5 scale back to the 1-10 scale expected by counselor view
      stress_level: Math.min(10, Math.max(1, e.stress * 2)),
      energy_level: Math.min(10, Math.max(1, e.energy * 2)),
      log_date: e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)
    }))

    // Sort newest first
    const allLogs = mappedLogs.sort((a, b) => {
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