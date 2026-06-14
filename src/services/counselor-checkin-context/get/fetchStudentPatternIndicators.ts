import { moodService } from '../../mood'
import {
  counselorCheckInWindowStart,
  COUNSELOR_CHECKIN_WINDOW_DAYS,
} from '../../../constants/counselor/counselor-checkin-policy'
import {
  computeCounselorPatternIndicators,
  type CounselorPatternIndicator,
} from '../../../constants/counselor/counselor-pattern-indicators'

/**
 * Pattern badges for roster triage — computed from raw logs for all assigned students.
 */
export async function fetchStudentPatternIndicators(
  studentId: string,
): Promise<CounselorPatternIndicator[]> {
  const windowStart = counselorCheckInWindowStart(COUNSELOR_CHECKIN_WINDOW_DAYS)
  const now = new Date()
  try {
    const raw = await moodService.getMoodLogs(studentId, windowStart, now)
    return computeCounselorPatternIndicators(
      raw.map((e) => ({
        log_date: e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp),
        dayKey: e.dayKey,
        stress: e.stress,
        energy: e.energy,
      })),
    )
  } catch (error) {
    console.error('Failed to compute pattern indicators for student:', studentId, error)
    return []
  }
}
