/**
 * Latest suggested Quick Reset / breathing exercise after mood check-in when the student
 * skips or leaves without completing it. Overwrites on each new check-in (no stacking).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearZenBreathingReminderScheduled,
  scheduleZenBreathingReminderPush,
} from "../services/push-notifications.service";

const STORAGE_KEY = "aurora_pending_breathing_reminder_v1";

export type PendingBreathingReminder = {
  exerciseId: string;
  savedAtMs: number;
};

export type SetPendingBreathingReminderOptions = {
  /**
   * When false, skip scheduling the delayed local push (banner on Zen still works).
   * Use when the student turned off session/wellness push in Profile.
   */
  schedulePush?: boolean;
};

export async function setPendingBreathingReminder(
  reminder: PendingBreathingReminder,
  options?: SetPendingBreathingReminderOptions,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminder));
  if (options?.schedulePush !== false) {
    await scheduleZenBreathingReminderPush(reminder.exerciseId);
  } else {
    await clearZenBreathingReminderScheduled();
  }
}

export async function clearPendingBreathingReminder(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await clearZenBreathingReminderScheduled();
}

export async function getPendingBreathingReminder(): Promise<PendingBreathingReminder | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingBreathingReminder;
    if (
      parsed &&
      typeof parsed.exerciseId === "string" &&
      parsed.exerciseId.trim().length > 0
    ) {
      return {
        exerciseId: parsed.exerciseId.trim(),
        savedAtMs:
          typeof parsed.savedAtMs === "number" ? parsed.savedAtMs : Date.now(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
