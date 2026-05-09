import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { BREATHING_EXERCISES } from "../features/breathing/breathing-data";

const DAILY_REMINDER_TYPE = "aurora_daily_checkin_reminder";

/** Local scheduled push for Zen breathing reminder after mood check-in (skip / Done without Quick Reset). */
export const ZEN_BREATHING_REMINDER_TYPE = "aurora_zen_breathing_reminder";

const ANDROID_CHANNEL_WELLNESS = "wellness-reminders";

/** Fires after this many seconds when a pending Zen exercise is queued (non-stacking). */
export const ZEN_BREATHING_REMINDER_DELAY_SEC = 1 * 60;

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
    .filter((n) => n.content?.data?.type === ZEN_BREATHING_REMINDER_TYPE)
    .map((n) => n.identifier);
  await Promise.all(
    ownIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

/**
 * Schedules one local notification (replaces any previous Zen breathing reminder).
 * Requires OS permission; respects optional push toggle via caller (only schedule when enabled).
 */
export async function scheduleZenBreathingReminderPush(
  exerciseId: string,
  opts?: { delaySeconds?: number },
): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  await ensureWellnessAndroidChannel();
  const permission = await ensureNotificationPermission();
  if (!permission) return false;

  await clearZenBreathingReminderScheduled();

  const ex = BREATHING_EXERCISES.find((e) => e.id === exerciseId);
  const name = ex?.name ?? "your breathing exercise";

  const delaySeconds = Math.max(
    60,
    typeof opts?.delaySeconds === "number"
      ? opts.delaySeconds
      : ZEN_BREATHING_REMINDER_DELAY_SEC,
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your breathing exercise is waiting",
      body: `Take a minute for ${name} — open Zen when you're ready.`,
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
      },
    },
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
