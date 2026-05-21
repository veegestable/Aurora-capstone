import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { moodService } from '../../mood'
import type { MoodLogEntryRow } from '../../mood/types'
import type { UserSettingsDoc } from '../../../types/user-settings.types'
import {
  counselorCheckInWindowStart,
  COUNSELOR_CHECKIN_WINDOW_DAYS,
  COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS,
} from '../../../constants/counselor/counselor-checkin-policy'

/**
 * Mood-only row for counselors without journal consent from this student.
 * Counselor still sees the mood label, intensity, and timestamp; everything else
 * is stripped so triage helpers never infer state from another counselor's
 * caseload.
 */
function sanitizeMoodLogForCounselor(row: MoodLogEntryRow): MoodLogEntryRow {
  return {
    ...row,
    notes: '',
    durationMinutes: 0,
    eventCategories: [],
    eventTags: [],
    bathTaken: undefined,
    mealResponses: [],
    journalImageUrl: '',
    journalSource: undefined,
    detectionMethod: undefined,
  }
}

/**
 * Returns the student's recent mood window. Full journal detail only when the
 * student has flagged this counselor in `userSettings.counselorJournalAccess`
 * (a.k.a. Special Population). Otherwise returns sanitized rows (mood + time).
 */
export async function fetchStudentCounselorDetailedContext(
  studentId: string,
  counselorId: string,
): Promise<{
  journalAccessGranted: boolean
  logs: MoodLogEntryRow[]
}> {
  const settingsRef = doc(db, 'userSettings', studentId)
  const settingsSnap = await getDoc(settingsRef)
  const settings = settingsSnap.exists() ? (settingsSnap.data() as UserSettingsDoc) : null
  const journalAccessGranted =
    settings?.counselorJournalAccess?.[counselorId] === true

  const windowDays = journalAccessGranted
    ? COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS
    : COUNSELOR_CHECKIN_WINDOW_DAYS
  const start = counselorCheckInWindowStart(windowDays)
  const end = new Date()
  let raw: MoodLogEntryRow[] = []
  try {
    raw = await moodService.getMoodLogs(studentId, start, end)
  } catch (e) {
    console.error('Failed to load mood window for counselor view:', e)
    raw = []
  }

  if (journalAccessGranted) {
    return { journalAccessGranted: true, logs: raw }
  }
  return {
    journalAccessGranted: false,
    logs: raw.map(sanitizeMoodLogForCounselor),
  }
}