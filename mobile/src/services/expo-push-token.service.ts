import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { configureNotificationHandler } from "./push-notifications.service";

const MAX_EXPO_PUSH_TOKENS = 8;

/** After a failed Expo token fetch, skip retries to avoid long timeouts stacking (dev lag + log spam). */
let expoPushTokenFetchBlockedUntil = 0;
const EXPO_PUSH_TOKEN_FAIL_COOLDOWN_MS = 2 * 60 * 1000;

export type ExpoPushTokenEntry = {
  token: string;
  platform: "android" | "ios" | "web";
  updated_at: Timestamp;
};

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId?.trim() || undefined;
}

function privatePushDocRef(userId: string) {
  return doc(db, "users", userId, "private", "push");
}

/**
 * Registers an Expo push token (when OS permission allows) and stores it under
 * `users/{uid}/private/push` for future Cloud Function delivery. Safe no-op on
 * simulator, missing EAS project id, denied permission, or failures.
 */
export async function syncExpoPushTokenToUserDoc(userId: string): Promise<void> {
  try {
    configureNotificationHandler();

    const projectId = easProjectId();
    if (!projectId) {
      if (__DEV__) {
        console.warn(
          "[ExpoPushToken] Missing extra.eas.projectId — cannot obtain push token.",
        );
      }
      return;
    }

    const perm = await Notifications.getPermissionsAsync();
    const granted =
      perm.granted ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return;

    const now = Date.now();
    if (now < expoPushTokenFetchBlockedUntil) return;

    let expoPushToken: string;
    try {
      const res = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = res.data;
      expoPushTokenFetchBlockedUntil = 0;
    } catch (e) {
      expoPushTokenFetchBlockedUntil = now + EXPO_PUSH_TOKEN_FAIL_COOLDOWN_MS;
      if (__DEV__) {
        console.warn("[ExpoPushToken] getExpoPushTokenAsync failed:", e);
      }
      return;
    }

    if (!expoPushToken?.trim()) return;

    const platform: ExpoPushTokenEntry["platform"] =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : "web";

    const ref = privatePushDocRef(userId);
    const snap = await getDoc(ref);
    const prevRaw = snap.exists()
      ? ((snap.data().expo_push_tokens ?? []) as ExpoPushTokenEntry[])
      : [];

    const prev = prevRaw.filter(
      (x) => x && typeof x.token === "string" && x.token !== expoPushToken,
    );

    if (
      prevRaw[0]?.token === expoPushToken &&
      prevRaw[0]?.platform === platform
    ) {
      return;
    }

    const next: ExpoPushTokenEntry[] = [
      {
        token: expoPushToken,
        platform,
        updated_at: Timestamp.now(),
      },
      ...prev,
    ].slice(0, MAX_EXPO_PUSH_TOKENS);

    await setDoc(
      ref,
      {
        expo_push_tokens: next,
        updated_at: Timestamp.now(),
      },
      { merge: true },
    );
  } catch (e) {
    if (__DEV__) {
      console.warn("[ExpoPushToken] syncExpoPushTokenToUserDoc failed:", e);
    }
  }
}
