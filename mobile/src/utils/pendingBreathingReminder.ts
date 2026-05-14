/**
 * Latest suggested Quick Reset / breathing exercise after mood check-in when the student
 * skips or leaves without completing it. Overwrites on each new check-in (no stacking).
 * Stored per Firebase user so a new account on the same device does not inherit another user's reminder.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearZenBreathingReminderScheduled,
  scheduleZenBreathingReminderPush,
} from "../services/push-notifications.service";

/** Legacy global key (no user id) — removed on read to avoid cross-account leakage. */
const LEGACY_STORAGE_KEY = "aurora_pending_breathing_reminder_v1";

function storageKeyForUser(userId: string): string {
  return `aurora_pending_breathing_reminder_v2:${userId.trim()}`;
}

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

/** Remove legacy global row if present (cannot be attributed to a specific account). */
async function removeLegacyReminderIfPresent(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy != null) {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export async function setPendingBreathingReminder(
  reminder: PendingBreathingReminder,
  userId: string,
  options?: SetPendingBreathingReminderOptions,
): Promise<void> {
  const uid = userId.trim();
  if (!uid) return;
  await AsyncStorage.setItem(storageKeyForUser(uid), JSON.stringify(reminder));
  await removeLegacyReminderIfPresent();
  if (options?.schedulePush !== false) {
    await scheduleZenBreathingReminderPush(reminder.exerciseId);
  } else {
    await clearZenBreathingReminderScheduled();
  }
}

export async function clearPendingBreathingReminder(
  userId?: string | null,
): Promise<void> {
  const uid = userId?.trim();
  if (uid) {
    try {
      await AsyncStorage.removeItem(storageKeyForUser(uid));
    } catch {
      /* ignore */
    }
  }
  await removeLegacyReminderIfPresent();
  await clearZenBreathingReminderScheduled();
}

export async function getPendingBreathingReminder(
  userId: string | undefined | null,
): Promise<PendingBreathingReminder | null> {
  const uid = userId?.trim();
  if (!uid) {
    await removeLegacyReminderIfPresent();
    return null;
  }

  await removeLegacyReminderIfPresent();

  const raw = await AsyncStorage.getItem(storageKeyForUser(uid));
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
