import { getUserSettings } from "./mood-firestore-v2.service";
import { counselorCheckInWindowStart } from "../constants/counselor-checkin-policy";
import { moodService } from "./mood.service";

type MergedMoodLogRow = Awaited<
  ReturnType<typeof moodService.getMoodLogs>
>[number];

/**
 * Recent mood logs for directory / triage signals. All students: counselors may use self-report
 * stress/energy for sorting; UI surfaces for students not in “special population” show only
 * date, time, and mood (see CounselorStudentJournalCalendar privacyMode).
 */
export async function fetchStudentCheckInSignalContextForCounselor(
  studentId: string,
): Promise<{ logs: MergedMoodLogRow[] }> {
  const start = counselorCheckInWindowStart();
  const end = new Date();
  const logs = await moodService.getMoodLogs(
    studentId,
    start.toISOString(),
    end.toISOString(),
  );
  return { logs };
}

/**
 * Full journal + analytics (notes, sleep, meals, images, etc.) for this counselor only when the
 * student is in the special population: session request sent to this counselor, or student
 * accepted this counselor’s proposed session time (journal access flag; no revoke in-app yet).
 */
export async function fetchStudentCounselorDetailedContext(
  studentId: string,
  counselorId: string,
): Promise<{
  journalAccessGranted: boolean;
  logs: MergedMoodLogRow[];
}> {
  const settings = await getUserSettings(studentId);
  const journalAccessGranted =
    settings.counselorJournalAccess?.[counselorId] === true;
  if (!journalAccessGranted) {
    return { journalAccessGranted: false, logs: [] };
  }
  const start = counselorCheckInWindowStart();
  const end = new Date();
  const logs = await moodService.getMoodLogs(
    studentId,
    start.toISOString(),
    end.toISOString(),
  );
  return { journalAccessGranted: true, logs };
}
