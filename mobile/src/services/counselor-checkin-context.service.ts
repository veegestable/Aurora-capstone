import { getUserSettings } from "./mood-firestore-v2.service";
import {
  counselorCheckInWindowStart,
  COUNSELOR_CHECKIN_WINDOW_DAYS,
  COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS,
} from "../constants/counselor-checkin-policy";
import { moodService, type MergedMoodLog } from "./mood.service";

async function loadMoodWindowForStudent(
  studentId: string,
  windowDays: number,
): Promise<MergedMoodLog[]> {
  const start = counselorCheckInWindowStart(windowDays);
  const end = new Date();
  try {
    return await moodService.getMoodLogs(studentId, start.toISOString(), end.toISOString());
  } catch (err) {
    console.warn("[counselor-checkin] Could not load mood logs for student", studentId, err);
    return [];
  }
}

/**
 * Per-student userSettings.counselorJournalAccess[counselorId] — only that counselor
 * may see full self-report / journal-shaped fields. Everyone else gets mood-only.
 */
function journalAccessForCounselor(
  settings: Awaited<ReturnType<typeof getUserSettings>>,
  counselorId: string,
): boolean {
  return settings.counselorJournalAccess?.[counselorId] === true;
}

/**
 * Mood-only row for counselors without journal consent from this student.
 * Stress/energy are neutralized so triage helpers never infer state from another counselor’s caseload.
 */
export function sanitizeMergedMoodLogForCounselorWithoutJournalAccess(
  row: MergedMoodLog,
): MergedMoodLog {
  return {
    ...row,
    notes: "",
    stress_level: 1,
    energy_level: 10,
    sleep_quality: undefined,
    classes_count: undefined,
    exams_count: undefined,
    deadlines_count: undefined,
    event_tags: [],
    event_categories: [],
    journal_image_url: "",
    bath_taken: false,
    meal_responses: [],
    duration_in_minutes: undefined,
    emotional_volume: undefined,
  };
}

/**
 * Recent mood window for a counselor view: full rows only if this counselor has
 * journal access for that student; otherwise mood/emotion + time only (sanitized).
 */
export async function fetchStudentCheckInSignalContextForCounselor(
  studentId: string,
  counselorId: string,
): Promise<{ logs: MergedMoodLog[] }> {
  const settings = await getUserSettings(studentId);
  const raw = await loadMoodWindowForStudent(studentId, COUNSELOR_CHECKIN_WINDOW_DAYS);
  if (journalAccessForCounselor(settings, counselorId)) {
    return { logs: raw };
  }
  return {
    logs: raw.map(sanitizeMergedMoodLogForCounselorWithoutJournalAccess),
  };
}

/**
 * Full journal + analytics only when this student granted access to this counselor
 * (session request or accepted proposed time). Otherwise returns the same mood-only
 * window as {@link fetchStudentCheckInSignalContextForCounselor}.
 */
export async function fetchStudentCounselorDetailedContext(
  studentId: string,
  counselorId: string,
): Promise<{
  journalAccessGranted: boolean;
  logs: MergedMoodLog[];
}> {
  const settings = await getUserSettings(studentId);
  const journalAccessGranted = journalAccessForCounselor(settings, counselorId);
  const windowDays = journalAccessGranted
    ? COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS
    : COUNSELOR_CHECKIN_WINDOW_DAYS;
  const raw = await loadMoodWindowForStudent(studentId, windowDays);
  if (journalAccessGranted) {
    return { journalAccessGranted: true, logs: raw };
  }
  return {
    journalAccessGranted: false,
    logs: raw.map(sanitizeMergedMoodLogForCounselorWithoutJournalAccess),
  };
}
