import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  StudentWellnessNudgeCopy,
  StudentWellnessNudgeId,
} from "../constants/student-wellness-nudges";
import {
  detectStudentWellnessNudges,
  WELLNESS_NUDGE_COOLDOWN_MS,
} from "../constants/student-wellness-nudges";
import { moodService } from "./mood.service";
import { syncPendingWellnessNudges } from "../utils/pendingBreathingReminder";
import { scheduleZenBreathingReminderPush } from "./push-notifications.service";

const COOLDOWN_KEY_PREFIX = "aurora_wellness_nudge_cooldown_v2:";

type WellnessNudgeCooldownMap = Partial<Record<StudentWellnessNudgeId, number>>;

function cooldownKey(userId: string): string {
  return `${COOLDOWN_KEY_PREFIX}${userId.trim()}`;
}

async function readCooldownMap(
  userId: string,
): Promise<WellnessNudgeCooldownMap> {
  try {
    const raw = await AsyncStorage.getItem(cooldownKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WellnessNudgeCooldownMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCooldownForTrigger(
  userId: string,
  triggerId: StudentWellnessNudgeId,
  map: WellnessNudgeCooldownMap,
): Promise<void> {
  const next: WellnessNudgeCooldownMap = {
    ...map,
    [triggerId]: Date.now(),
  };
  await AsyncStorage.setItem(cooldownKey(userId), JSON.stringify(next));
}

function cooldownAllows(
  triggerId: StudentWellnessNudgeId,
  map: WellnessNudgeCooldownMap,
): boolean {
  const savedAtMs = map[triggerId];
  if (savedAtMs == null) return true;
  return Date.now() - savedAtMs >= WELLNESS_NUDGE_COOLDOWN_MS;
}

function nudgeToReminder(nudge: StudentWellnessNudgeCopy) {
  return {
    exerciseId: nudge.exerciseId,
    savedAtMs: Date.now(),
    source: "wellness_pattern" as const,
    triggerId: nudge.id,
    bannerTitle: nudge.bannerTitle,
    bannerBody: nudge.bannerBody,
    motivationLine: nudge.motivationLine,
  };
}

export type EvaluateStudentWellnessNudgeOptions = {
  schedulePush?: boolean;
};

export async function evaluateStudentWellnessNudgeAfterCheckIn(
  userId: string,
  options?: EvaluateStudentWellnessNudgeOptions,
): Promise<boolean> {
  const uid = userId.trim();
  if (!uid) return false;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 14);
  windowStart.setHours(0, 0, 0, 0);

  let logs: Awaited<ReturnType<typeof moodService.getMoodLogs>> = [];
  try {
    logs = await moodService.getMoodLogs(
      uid,
      windowStart.toISOString(),
      new Date().toISOString(),
    );
  } catch {
    return false;
  }

  const nudges = detectStudentWellnessNudges(
    logs.map((row) => ({
      log_date: row.log_date,
      dayKey: row.dayKey,
      stress_level: row.stress_level,
      energy_level: row.energy_level,
      mood: row.mood,
      emotions: row.emotions,
      intensity: row.intensity,
    })),
  );

  if (nudges.length === 0) {
    await syncPendingWellnessNudges(uid, [], []);
    return false;
  }

  const cooldownMap = await readCooldownMap(uid);
  const activeIds = nudges.map((n) => n.id);
  await syncPendingWellnessNudges(
    uid,
    nudges.map(nudgeToReminder),
    activeIds,
  );

  let fired = false;
  const devImmediate = typeof __DEV__ !== "undefined" && __DEV__;

  for (const nudge of nudges) {
    if (options?.schedulePush !== false && cooldownAllows(nudge.id, cooldownMap)) {
      await scheduleZenBreathingReminderPush(nudge.exerciseId, {
        title: nudge.pushTitle,
        body: nudge.pushBody,
        delaySeconds: devImmediate ? 10 : undefined,
        immediate: devImmediate,
        nudgeId: nudge.id,
      });
      await writeCooldownForTrigger(uid, nudge.id, cooldownMap);
      cooldownMap[nudge.id] = Date.now();
      fired = true;
    }
  }

  return fired || nudges.length > 0;
}
