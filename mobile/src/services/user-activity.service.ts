import { auditLogsService } from "./audit-logs.service";

/** After explicit login, skip redundant `app_active` pings for a short window. */
let suppressAppActiveUntil = 0;

const lastAppActiveByUser = new Map<string, number>();
const APP_ACTIVE_MIN_GAP_MS = 5 * 60 * 1000;

export function suppressAppActivityLogging(durationMs = 120_000) {
  suppressAppActiveUntil = Date.now() + durationMs;
}

function isCounselorOrStudent(role: string): boolean {
  return role === "counselor" || role === "student";
}

/**
 * Log counselor/student sign-in (email/password). Shown on admin activity timeline.
 * Admins are omitted here so the stream highlights roster roles.
 */
export function logUserLogin(params: {
  userId: string;
  role: string;
  displayName: string;
  email: string;
}): void {
  if (!isCounselorOrStudent(params.role)) return;
  suppressAppActivityLogging(120_000);
  void auditLogsService
    .write({
      performedBy: params.userId,
      performedByRole: params.role,
      action: "user_login",
      targetType: "session",
      targetId: params.userId,
      metadata: {
        displayName: params.displayName,
        email: params.email,
      },
    })
    .catch(() => {});
}

/**
 * Log counselor/student sign-out. Must be awaited while still authenticated.
 */
export async function logUserLogoutCounselorOrStudent(params: {
  userId: string;
  role: string;
  displayName: string;
  email: string;
}): Promise<void> {
  if (!isCounselorOrStudent(params.role)) return;
  try {
    await auditLogsService.write({
      performedBy: params.userId,
      performedByRole: params.role,
      action: "user_logout",
      targetType: "session",
      targetId: params.userId,
      metadata: {
        displayName: params.displayName,
        email: params.email,
      },
    });
  } catch {
    /* best-effort; still sign out */
  }
}

/**
 * Log that the user had the app in the foreground (cold start or resume).
 * Throttled per user to limit Firestore writes.
 */
export function logAppActiveIfDue(params: {
  userId: string;
  role: string;
  displayName: string;
  email: string;
}): void {
  const now = Date.now();
  if (now < suppressAppActiveUntil) return;
  const prev = lastAppActiveByUser.get(params.userId) ?? 0;
  if (now - prev < APP_ACTIVE_MIN_GAP_MS) return;
  lastAppActiveByUser.set(params.userId, now);

  void auditLogsService
    .write({
      performedBy: params.userId,
      performedByRole: params.role,
      action: "app_active",
      targetType: "session",
      targetId: params.userId,
      metadata: {
        displayName: params.displayName,
        email: params.email,
      },
    })
    .catch(() => {});
}

export function clearActivityThrottleForUser(userId: string) {
  lastAppActiveByUser.delete(userId);
}
