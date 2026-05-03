import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "../stores/AuthContext";
import { logAppActiveIfDue } from "../services/user-activity.service";

/**
 * Records `app_active` audit entries when the app is foregrounded,
 * throttled per user (see user-activity.service). Pair with `logUserLogin` on sign-in.
 */
export function UserActivityLogger() {
  const { user, loading } = useAuth();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const ping = useCallback(() => {
    if (!user?.id) return;
    logAppActiveIfDue({
      userId: user.id,
      role: user.role,
      displayName: user.full_name ?? "",
      email: user.email ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (loading || !user?.id) return;

    ping();

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      if (
        (prev === "background" || prev === "inactive") &&
        next === "active"
      ) {
        ping();
      }
      appStateRef.current = next;
    });

    return () => sub.remove();
  }, [loading, user?.id, ping]);

  return null;
}
