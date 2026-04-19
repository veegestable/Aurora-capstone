import { getUserSettings } from './mood-firestore-v2.service';
import { counselorCheckInWindowStart } from '../constants/counselor-checkin-policy';
import { moodService } from './mood.service';

type MergedMoodLogRow = Awaited<ReturnType<typeof moodService.getMoodLogs>>[number];

/**
 * Loads whether the student allows counselors to see recent check-in summaries,
 * and if so, merged mood history in the counselor window (same sources as the student app:
 * legacy `mood_logs` plus v2 `moodLogs/{uid}/entries`).
 */
export async function fetchStudentCheckInContextForCounselor(studentId: string): Promise<{
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
    const logs = await moodService.getMoodLogs(studentId, start.toISOString(), end.toISOString());
    return { sharingEnabled: true, logs };
}
