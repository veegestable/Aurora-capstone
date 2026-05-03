import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { Platform } from "react-native";
import { auth, db } from "./firebase";
import type { UserProfile } from "./firebase-auth.service";

let googleConfigured = false;

function getWebClientId(): string {
  const fromExtra =
    (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ||
    "";
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const id = (fromExtra || fromEnv).trim();
  if (!id) {
    throw new Error(
      "Missing Google Web Client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (OAuth 2.0 Web client from Firebase / Google Cloud) and rebuild.",
    );
  }
  return id;
}

export function ensureGoogleSignInConfigured(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: getWebClientId(),
  });
  googleConfigured = true;
}

async function resolveIdTokenFromSignInResult(data: {
  idToken: string | null;
}): Promise<string> {
  if (data.idToken) return data.idToken;
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.idToken) {
    throw new Error(
      "Google Sign-In did not return an ID token. Confirm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID matches the Web client in Firebase (same project as your iOS app).",
    );
  }
  return tokens.idToken;
}

async function ensureFirestoreProfileForGoogleUser(
  firebaseUser: FirebaseAuthUser,
): Promise<UserProfile> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const email = firebaseUser.email || "";
  const displayName =
    firebaseUser.displayName?.trim() ||
    email.split("@")[0] ||
    "Aurora user";

  const userProfile: UserProfile = {
    uid: firebaseUser.uid,
    email,
    full_name: displayName,
    role: "student",
    created_at: new Date(),
    updated_at: new Date(),
  };

  await setDoc(ref, userProfile);
  return userProfile;
}

function mapFirebaseAuthError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    if (err.code === "auth/account-exists-with-different-credential") {
      return new Error(
        "An account with this email already exists using email and password. Sign in with email, then link Google from Profile if you want both.",
      );
    }
    if (err.code === "auth/credential-already-in-use") {
      return new Error(
        "This Google account is already linked to another Aurora user. Sign in with Google using that account, or use a different Google account to link here.",
      );
    }
    if (err.code === "auth/provider-already-linked") {
      return new Error("Google is already linked to this account.");
    }
    if (err.code === "auth/email-already-in-use") {
      return new Error(
        "This email is already in use by another account. Try a different Google account.",
      );
    }
    return new Error(err.message || "Google authentication failed.");
  }
  if (err instanceof Error) return err;
  return new Error("Google authentication failed.");
}

export async function performGoogleSignInAndLoadProfile(): Promise<UserProfile> {
  ensureGoogleSignInConfigured();

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  const response = await GoogleSignin.signIn();
  if (response.type !== "success" || !response.data) {
    throw new Error("GOOGLE_SIGN_IN_CANCELLED");
  }

  const idToken = await resolveIdTokenFromSignInResult(response.data);
  const credential = GoogleAuthProvider.credential(idToken);

  try {
    const userCred = await signInWithCredential(auth, credential);
    return await ensureFirestoreProfileForGoogleUser(userCred.user);
  } catch (e) {
    throw mapFirebaseAuthError(e);
  }
}

export async function performGoogleAccountLink(): Promise<void> {
  ensureGoogleSignInConfigured();

  const current = auth.currentUser;
  if (!current) {
    throw new Error("You must be signed in to link a Google account.");
  }

  if (current.providerData.some((p) => p.providerId === "google.com")) {
    throw new Error("Google is already linked to this account.");
  }

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  const response = await GoogleSignin.signIn();
  if (response.type !== "success" || !response.data) {
    throw new Error("GOOGLE_SIGN_IN_CANCELLED");
  }

  const idToken = await resolveIdTokenFromSignInResult(response.data);
  const credential = GoogleAuthProvider.credential(idToken);

  try {
    await linkWithCredential(current, credential);
  } catch (e) {
    throw mapFirebaseAuthError(e);
  }
}

export async function signOutGoogleSdk(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* user may never have used Google on this device */
  }
}
