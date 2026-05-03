import { firestoreService } from '../../firebase-firestore'
import { moodV2Service } from '../../mood-v2'
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
    const [legacyLogs, v2Entries] = await Promise.all([
      firestoreService.getMoodLogs(studentId, windowStart, now),
      moodV2Service.getMoodLogEntries(studentId, windowStart, now),
    ])

    const v2Mapped = v2Entries.map((e) => ({
      stress_level: Math.min(10, Math.max(1, e.stress * 2)),
      energy_level: Math.min(10, Math.max(1, e.energy * 2)),
      log_date: e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp),
    }))

    const legacyMapped = legacyLogs.map((l) => ({
      stress_level: typeof l.stress_level === 'number' ? l.stress_level : undefined,
      energy_level: typeof l.energy_level === 'number' ? l.energy_level : undefined,
      log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date as string),
    }))

    const allLogs = [...legacyMapped, ...v2Mapped].sort((a, b) => {
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
