import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { moodService } from '../../mood'
import { counselorCheckInWindowStart } from '../../../constants/counselor/counselor-checkin-policy'

export interface CheckInContextResult {
  logs: Array<{
    stress_level?: number
    energy_level?: number
    log_date?: Date
  }>
}

/**
 * Fetch a student's check-in context for counselor triage (all students; same window as mobile).
 */
export const fetchStudentCheckInContext = async (studentId: string): Promise<CheckInContextResult> => {
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

    return { logs: allLogs }
  } catch (error) {
    console.error('❌ Failed to fetch check-in context for student:', studentId, error)
    return { logs: [] }
  }
}
