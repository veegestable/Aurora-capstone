import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_BACKGROUND_MS_KEY = "aurora_auth_last_background_ms";

/**
 * Optional forced sign-out after the app has stayed in the background this long (ms).
 * Set EXPO_PUBLIC_AUTH_MAX_IDLE_MS in env: e.g. 259200000 = 3 days, 604800000 = 7 days.
 * Use 0 to disable (Firebase refresh tokens stay valid until revoked — default disable).
 */
export function getAuthSessionMaxIdleMs(): number {
  const raw = process.env.EXPO_PUBLIC_AUTH_MAX_IDLE_MS;
  const n = raw != null && raw !== "" ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  return 0;
}

export async function touchAuthSessionLastBackgroundNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_BACKGROUND_MS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function clearAuthSessionIdleTracking(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_BACKGROUND_MS_KEY);
  } catch {
    /* ignore */
  }
}

/** True if max idle is configured and elapsed since last background exceeds it. */
export async function isAuthSessionIdleExpired(): Promise<boolean> {
  const maxMs = getAuthSessionMaxIdleMs();
  if (maxMs <= 0) return false;
  try {
    const raw = await AsyncStorage.getItem(LAST_BACKGROUND_MS_KEY);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last > maxMs;
  } catch {
    return false;
  }
}
