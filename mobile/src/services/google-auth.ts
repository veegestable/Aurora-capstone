import { Platform } from "react-native";
import type { UserProfile } from "./firebase-auth.service";

export async function performGoogleSignInAndLoadProfile(): Promise<UserProfile> {
  if (Platform.OS === "web") {
    return (await import("./google-auth.web")).performGoogleSignInAndLoadProfile();
  }
  return (await import("./google-auth.native")).performGoogleSignInAndLoadProfile();
}

export async function performGoogleAccountLink(): Promise<void> {
  if (Platform.OS === "web") {
    return (await import("./google-auth.web")).performGoogleAccountLink();
  }
  return (await import("./google-auth.native")).performGoogleAccountLink();
}

export async function signOutGoogleSdk(): Promise<void> {
  if (Platform.OS === "web") {
    return (await import("./google-auth.web")).signOutGoogleSdk();
  }
  return (await import("./google-auth.native")).signOutGoogleSdk();
}
