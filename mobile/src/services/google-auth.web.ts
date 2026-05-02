import type { UserProfile } from "./firebase-auth.service";

export async function performGoogleSignInAndLoadProfile(): Promise<UserProfile> {
  throw new Error(
    "Google Sign-In is only available in the iOS/Android app (development build), not in the browser.",
  );
}

export async function performGoogleAccountLink(): Promise<void> {
  throw new Error(
    "Linking a Google account is only available in the iOS/Android app (development build).",
  );
}

export async function signOutGoogleSdk(): Promise<void> {
  /* no-op on web */
}
