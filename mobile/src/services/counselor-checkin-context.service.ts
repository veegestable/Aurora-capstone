import { getUserSettings } from "./mood-firestore-v2.service";
import { counselorCheckInWindowStart } from "../constants/counselor-checkin-policy";
import { moodService } from "./mood.service";

type MergedMoodLogRow = Awaited<
  ReturnType<typeof moodService.getMoodLogs>
>[number];

/**
 * Loads whether the student allows counselors to see recent check-in summaries for directory signals,
 * and if so, merged mood history in the counselor window (stress / energy triage — same as before).
 */
export async function fetchStudentCheckInSignalContextForCounselor(
  studentId: string,
): Promise<{
  sharingEnabled: boolean;
  logs: MergedMoodLogRow[];
}> {
  const settings = await getUserSettings(studentId);
  const sharingEnabled = settings.shareCheckInsWithGuidance === true;
  if (!sharingEnabled) {
    return { sharingEnabled: false, logs: [] };
  }
  const start = counselorCheckInWindowStart();
  const end = new Date();
  const logs = await moodService.getMoodLogs(
    studentId,
    start.toISOString(),
    end.toISOString(),
  );
  return { sharingEnabled: true, logs };
}

/**
 * Detailed journals + same analytics surfaces as the student app — only when sharing is on AND
 * the student granted access to this counselor via the first session-request confirmation flow.
 */
export async function fetchStudentCounselorDetailedContext(
  studentId: string,
  counselorId: string,
): Promise<{
  sharingEnabled: boolean;
  journalAccessGranted: boolean;
  logs: MergedMoodLogRow[];
}> {
  const settings = await getUserSettings(studentId);
  const sharingEnabled = settings.shareCheckInsWithGuidance === true;
  const journalAccessGranted =
    settings.counselorJournalAccess?.[counselorId] === true;
  if (!sharingEnabled || !journalAccessGranted) {
    return {
      sharingEnabled,
      journalAccessGranted,
      logs: [],
    };
  }
  const start = counselorCheckInWindowStart();
  const end = new Date();
  const logs = await moodService.getMoodLogs(
    studentId,
    start.toISOString(),
    end.toISOString(),
  );
  return { sharingEnabled: true, journalAccessGranted: true, logs };
}
