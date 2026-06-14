/**
 * Latest suggested Quick Reset / breathing exercise after mood check-in when the student
 * skips or leaves without completing it. Overwrites on each new check-in (no stacking).
 * Stored per Firebase user so a new account on the same device does not inherit another user's reminder.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearZenBreathingNudgePush,
  clearZenBreathingReminderScheduled,
  scheduleZenBreathingReminderPush,
} from "../services/push-notifications.service";

/** Legacy global key (no user id) — removed on read to avoid cross-account leakage. */
const LEGACY_STORAGE_KEY = "aurora_pending_breathing_reminder_v1";

function storageKeyForUser(userId: string): string {
  return `aurora_pending_breathing_reminder_v2:${userId.trim()}`;
}

function wellnessStorageKeyForUser(userId: string): string {
  return `aurora_wellness_nudges_v1:${userId.trim()}`;
}

export type PendingBreathingReminderSource =
  | "check_in_skip"
  | "wellness_pattern";

export type PendingBreathingReminder = {
  exerciseId: string;
  savedAtMs: number;
  source?: PendingBreathingReminderSource;
  triggerId?: string;
  bannerTitle?: string;
  bannerBody?: string;
  motivationLine?: string;
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

function normalizeWellnessReminder(
  parsed: PendingBreathingReminder,
): PendingBreathingReminder | null {
  if (
    !parsed ||
    typeof parsed.exerciseId !== "string" ||
    parsed.exerciseId.trim().length === 0
  ) {
    return null;
  }
  return {
    exerciseId: parsed.exerciseId.trim(),
    savedAtMs:
      typeof parsed.savedAtMs === "number" ? parsed.savedAtMs : Date.now(),
    source: "wellness_pattern",
    triggerId:
      typeof parsed.triggerId === "string" ? parsed.triggerId : undefined,
    bannerTitle:
      typeof parsed.bannerTitle === "string" ? parsed.bannerTitle : undefined,
    bannerBody:
      typeof parsed.bannerBody === "string" ? parsed.bannerBody : undefined,
    motivationLine:
      typeof parsed.motivationLine === "string"
        ? parsed.motivationLine
        : undefined,
  };
}

export async function getPendingWellnessNudges(
  userId: string | undefined | null,
): Promise<PendingBreathingReminder[]> {
  const uid = userId?.trim();
  if (!uid) return [];

  let results: PendingBreathingReminder[] = [];
  const raw = await AsyncStorage.getItem(wellnessStorageKeyForUser(uid));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PendingBreathingReminder[];
      if (Array.isArray(parsed)) {
        results = parsed
          .map((row) => normalizeWellnessReminder(row))
          .filter((row): row is PendingBreathingReminder => row != null);
      }
    } catch {
      results = [];
    }
  }

  try {
    const legacyRaw = await AsyncStorage.getItem(storageKeyForUser(uid));
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as PendingBreathingReminder;
      if (legacy?.source === "wellness_pattern") {
        const normalized = normalizeWellnessReminder(legacy);
        if (normalized?.triggerId) {
          await AsyncStorage.removeItem(storageKeyForUser(uid));
          if (!results.some((row) => row.triggerId === normalized.triggerId)) {
            results = [...results, normalized];
            await AsyncStorage.setItem(
              wellnessStorageKeyForUser(uid),
              JSON.stringify(results),
            );
          }
        }
      }
    }
  } catch {
    /* ignore legacy migration */
  }

  return results;
}

export async function syncPendingWellnessNudges(
  userId: string,
  nudges: PendingBreathingReminder[],
  activeTriggerIds: string[],
): Promise<void> {
  const uid = userId.trim();
  if (!uid) return;

  const activeSet = new Set(activeTriggerIds);
  const merged = new Map<string, PendingBreathingReminder>();

  const existing = await getPendingWellnessNudges(uid);
  for (const row of existing) {
    const id = row.triggerId?.trim();
    if (id && activeSet.has(id)) {
      merged.set(id, row);
    }
  }

  for (const row of nudges) {
    const id = row.triggerId?.trim();
    if (!id || !activeSet.has(id)) continue;
    merged.set(id, {
      ...row,
      source: "wellness_pattern",
      savedAtMs: Date.now(),
    });
  }

  const next = [...merged.values()];
  if (next.length === 0) {
    await AsyncStorage.removeItem(wellnessStorageKeyForUser(uid));
    return;
  }
  await AsyncStorage.setItem(
    wellnessStorageKeyForUser(uid),
    JSON.stringify(next),
  );
}

export async function clearWellnessNudge(
  userId: string | undefined | null,
  triggerId?: string,
): Promise<void> {
  const uid = userId?.trim();
  if (!uid) return;

  if (!triggerId?.trim()) {
    await AsyncStorage.removeItem(wellnessStorageKeyForUser(uid));
    return;
  }

  const id = triggerId.trim();
  const existing = await getPendingWellnessNudges(uid);
  const next = existing.filter((row) => row.triggerId !== id);
  if (next.length === 0) {
    await AsyncStorage.removeItem(wellnessStorageKeyForUser(uid));
  } else {
    await AsyncStorage.setItem(
      wellnessStorageKeyForUser(uid),
      JSON.stringify(next),
    );
  }
  await clearZenBreathingNudgePush(id);
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

export async function clearAllWellnessNudges(
  userId?: string | null,
): Promise<void> {
  const uid = userId?.trim();
  if (!uid) return;
  const existing = await getPendingWellnessNudges(uid);
  await AsyncStorage.removeItem(wellnessStorageKeyForUser(uid));
  await Promise.all(
    existing
      .map((row) => row.triggerId?.trim())
      .filter((id): id is string => !!id)
      .map((id) => clearZenBreathingNudgePush(id)),
  );
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
      if (parsed.source === "wellness_pattern") {
        return null;
      }
      return {
        exerciseId: parsed.exerciseId.trim(),
        savedAtMs:
          typeof parsed.savedAtMs === "number" ? parsed.savedAtMs : Date.now(),
        source:
          parsed.source === "check_in_skip" ? parsed.source : undefined,
        triggerId:
          typeof parsed.triggerId === "string" ? parsed.triggerId : undefined,
        bannerTitle:
          typeof parsed.bannerTitle === "string"
            ? parsed.bannerTitle
            : undefined,
        bannerBody:
          typeof parsed.bannerBody === "string" ? parsed.bannerBody : undefined,
        motivationLine:
          typeof parsed.motivationLine === "string"
            ? parsed.motivationLine
            : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
