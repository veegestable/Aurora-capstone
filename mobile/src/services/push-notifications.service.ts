import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { BREATHING_EXERCISES } from "../features/breathing/breathing-data";
import type { MealScheduleItem } from "./mood-firestore-v2.service";

const DAILY_REMINDER_TYPE = "aurora_daily_checkin_reminder";

export const WAKE_ROUTINE_REMINDER_TYPE = "aurora_wake_reminder";
export const BATH_ROUTINE_REMINDER_TYPE = "aurora_bath_reminder";
export const MEAL_ROUTINE_REMINDER_TYPE = "aurora_meal_reminder";

const ROUTINE_REMINDER_TYPES = new Set([
  WAKE_ROUTINE_REMINDER_TYPE,
  BATH_ROUTINE_REMINDER_TYPE,
  MEAL_ROUTINE_REMINDER_TYPE,
]);

/** Local scheduled push for Zen breathing reminder after mood check-in (skip / Done without Quick Reset). */
export const ZEN_BREATHING_REMINDER_TYPE = "aurora_zen_breathing_reminder";

const ANDROID_CHANNEL_WELLNESS = "wellness-reminders";

/** Fires after this many seconds when a pending Zen exercise is queued (non-stacking). */
export const ZEN_BREATHING_REMINDER_DELAY_SEC = 5 * 60;

let handlerConfigured = false;
const FLOWERY_REMINDER_LINES = [
  "A gentle sunrise moment for you: breathe, smile, and log today's mood in Aurora.",
  "Let this be your soft morning ritual — a tiny check-in to honor how your heart feels today.",
  "Good day, bright soul. Pause for a moment and paint your mood with Aurora.",
  "Before the day rushes in, give yourself this quiet gift: a mindful mood check-in.",
];

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("daily-reminders", {
    name: "Daily reminders",
    description: "Aurora check-in reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function ensureWellnessAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_WELLNESS, {
    name: "Wellness reminders",
    description: "Breathing and mindfulness nudges from Aurora",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return !!(
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return !!(
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function clearDailyCheckInReminder(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ownIds = all
    .filter((n) => n.content?.data?.type === DAILY_REMINDER_TYPE)
    .map((n) => n.identifier);
  await Promise.all(
    ownIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

export async function scheduleDailyCheckInReminder(
  hour: number,
  minute = 0,
): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  await clearDailyCheckInReminder();

  const h = Math.min(23, Math.max(0, Math.floor(hour)));
  const m = Math.min(59, Math.max(0, Math.floor(minute)));
  const body =
    FLOWERY_REMINDER_LINES[
      Math.floor(Math.random() * FLOWERY_REMINDER_LINES.length)
    ];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "A small morning glow from Aurora",
      body,
      sound: true,
      data: {
        type: DAILY_REMINDER_TYPE,
        targetRoute: "/(student)/index",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
  });

  return true;
}

function parseHHmm(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

export async function clearWellnessRoutineReminders(): Promise<void> {
  configureNotificationHandler();
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ownIds = all
    .filter((n) => {
      const type = n.content?.data?.type;
      return typeof type === "string" && ROUTINE_REMINDER_TYPES.has(type);
    })
    .map((n) => n.identifier);
  await Promise.all(
    ownIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

async function scheduleRoutineDailyNotification(payload: {
  type: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
  focusSection?: "sleep" | "meals" | "bath";
  mealId?: string;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      sound: true,
      ...(Platform.OS === "android"
        ? {
            android: {
              channelId: ANDROID_CHANNEL_WELLNESS,
            },
          }
        : {}),
      data: {
        type: payload.type,
        targetRoute: "/(student)/index",
        ...(payload.focusSection
          ? { focusSection: payload.focusSection }
          : {}),
        ...(payload.mealId ? { mealId: payload.mealId } : {}),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: payload.hour,
      minute: payload.minute,
    },
  });
}

export async function scheduleWellnessRoutineReminders(opts: {
  usualWakeTime: string;
  usualBathTime: string;
  mealSchedule: MealScheduleItem[];
}): Promise<boolean> {
  configureNotificationHandler();
  await ensureWellnessAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  await clearWellnessRoutineReminders();

  const wake = parseHHmm(opts.usualWakeTime);
  if (wake) {
    await scheduleRoutineDailyNotification({
      type: WAKE_ROUTINE_REMINDER_TYPE,
      hour: wake.hour,
      minute: wake.minute,
      title: "Good morning from Aurora",
      body: "How did you sleep? Tap to log your sleep quality in today's check-in.",
      focusSection: "sleep",
    });
  }

  const bath = parseHHmm(opts.usualBathTime);
  if (bath) {
    await scheduleRoutineDailyNotification({
      type: BATH_ROUTINE_REMINDER_TYPE,
      hour: bath.hour,
      minute: bath.minute,
      title: "Bath time reminder",
      body: "When you're ready, open Aurora to log your bath in today's check-in.",
      focusSection: "bath",
    });
  }

  for (const meal of opts.mealSchedule) {
    const parsed = parseHHmm(meal.time);
    if (!parsed) continue;
    const label = (meal.label || "Meal").trim() || "Meal";
    await scheduleRoutineDailyNotification({
      type: MEAL_ROUTINE_REMINDER_TYPE,
      hour: parsed.hour,
      minute: parsed.minute,
      title: `Time for ${label}`,
      body: `Log ${label.toLowerCase()} in Aurora when you're ready.`,
      focusSection: "meals",
      mealId: meal.id,
    });
  }

  return true;
}

export async function sendTestDailyCheckInNotification(): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Aurora test reminder",
      body: "A little reminder bloom just for you — your daily mood check-in is ready.",
      sound: true,
      data: {
        type: DAILY_REMINDER_TYPE,
        test: true,
        targetRoute: "/(student)/index",
      },
    },
    trigger: null,
  });

  return true;
}

export async function clearZenBreathingReminderScheduled(): Promise<void> {
  configureNotificationHandler();
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ownIds = all
    .filter(
      (n) =>
        n.content?.data?.type === ZEN_BREATHING_REMINDER_TYPE &&
        !n.content?.data?.nudgeId,
    )
    .map((n) => n.identifier);
  await Promise.all(
    ownIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

export async function clearZenBreathingNudgePush(
  nudgeId: string,
): Promise<void> {
  configureNotificationHandler();
  const id = nudgeId.trim();
  if (!id) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ownIds = all
    .filter(
      (n) =>
        n.content?.data?.type === ZEN_BREATHING_REMINDER_TYPE &&
        n.content?.data?.nudgeId === id,
    )
    .map((n) => n.identifier);
  await Promise.all(
    ownIds.map((nid) => Notifications.cancelScheduledNotificationAsync(nid)),
  );
}

/**
 * Schedules one local notification (replaces any previous Zen breathing reminder).
 * Requires OS permission; respects optional push toggle via caller (only schedule when enabled).
 */
export async function scheduleZenBreathingReminderPush(
  exerciseId: string,
  opts?: {
    delaySeconds?: number;
    title?: string;
    body?: string;
    immediate?: boolean;
    nudgeId?: string;
  },
): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  await ensureWellnessAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  const nudgeId = opts?.nudgeId?.trim();
  if (nudgeId) {
    await clearZenBreathingNudgePush(nudgeId);
  } else {
    await clearZenBreathingReminderScheduled();
  }

  const ex = BREATHING_EXERCISES.find((e) => e.id === exerciseId);
  const name = ex?.name ?? "your breathing exercise";

  const content = {
    title: opts?.title?.trim() || "Your breathing exercise is waiting",
    body:
      opts?.body?.trim() ||
      `Take a few minutes for ${name} — open Zen when you're ready.`,
    sound: true,
    ...(Platform.OS === "android"
      ? {
          android: {
            channelId: ANDROID_CHANNEL_WELLNESS,
          },
        }
      : {}),
    data: {
      type: ZEN_BREATHING_REMINDER_TYPE,
      targetRoute: "/(student)/resources",
      exerciseId,
      ...(nudgeId ? { nudgeId } : {}),
    },
  };

  if (opts?.immediate) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    return true;
  }

  const defaultDelay =
    typeof __DEV__ !== "undefined" && __DEV__
      ? 10
      : ZEN_BREATHING_REMINDER_DELAY_SEC;
  const minDelay = typeof __DEV__ !== "undefined" && __DEV__ ? 5 : 60;
  const delaySeconds = Math.max(
    minDelay,
    typeof opts?.delaySeconds === "number" ? opts.delaySeconds : defaultDelay,
  );

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      repeats: false,
    },
  });

  return true;
}

export async function sendSessionDeviceNotification(payload: {
  title: string;
  body: string;
  targetRoute: "/(student)/messages" | "/(counselor)/messages";
  notificationId: string;
}): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      sound: true,
      data: {
        type: "session_update",
        notificationId: payload.notificationId,
        target_route: payload.targetRoute,
      },
    },
    trigger: null,
  });

  return true;
}
