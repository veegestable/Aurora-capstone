// Firebase Authentication Service for Aurora
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import { isEmailVerificationRequiredForSignIn } from "../utils/signupEmailPolicy";
import {
  type CollegeCode,
  resolveCollegeCodeFromUserData,
  isCollegeCode,
} from "../constants/colleges";
import {
  inferCollegeCodeFromProgramLabel,
  isProgramInCollege,
} from "../constants/college-programs-iit";

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "counselor" | "student";
  /** Mobile / phone contact (counselor & student registration). */
  contactNumber?: string;
  /** Required for student & counselor so directory rules work from day one. */
  college_code?: CollegeCode;
  /** Student only: catalog label for `college_code` (see `college-programs-iit.ts`). */
  program?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export type CounselorApprovalStatus = "pending" | "approved" | "rejected";

async function backfillCollegeCodeFromLegacyIfNeeded(
  uid: string,
  profile: UserProfile,
): Promise<UserProfile> {
  if (profile.college_code && String(profile.college_code).trim()) {
    return profile;
  }
  const inferred = resolveCollegeCodeFromUserData(
    profile as unknown as Record<string, unknown>,
  );
  if (!inferred) return profile;
  try {
    await updateDoc(doc(db, "users", uid), {
      college_code: inferred,
      updated_at: new Date(),
    });
    return { ...profile, college_code: inferred };
  } catch (e) {
    console.warn("[profile] college_code backfill skipped:", e);
    return profile;
  }
}

/** When a student has a catalog `program` but no resolvable college, infer and persist `college_code`. */
async function backfillStudentCollegeCodeFromProgramIfNeeded(
  uid: string,
  profile: UserProfile,
): Promise<UserProfile> {
  if (profile.role !== "student") return profile;
  const resolved = resolveCollegeCodeFromUserData(
    profile as unknown as Record<string, unknown>,
  );
  if (resolved) return profile;
  const prog = profile.program?.trim();
  if (!prog) return profile;
  const inferred = inferCollegeCodeFromProgramLabel(prog);
  if (!inferred || !isProgramInCollege(inferred, prog)) return profile;
  try {
    await updateDoc(doc(db, "users", uid), {
      college_code: inferred,
      updated_at: new Date(),
    });
    return { ...profile, college_code: inferred };
  } catch (e) {
    console.warn("[profile] college_code from program backfill skipped:", e);
    return profile;
  }
}

function emailVerifiedFromIdTokenClaims(
  claims: Record<string, unknown> | undefined,
): boolean {
  if (!claims) return false;
  const v = claims.email_verified;
  return v === true || v === "true";
}

/** Best-effort: Auth user object + ID token `email_verified` claim (claim can lead after verify link). */
async function readAuthEmailVerifiedEffective(user: User): Promise<boolean> {
  try {
    await user.reload();
  } catch {
    /* ignore */
  }
  if (user.emailVerified) return true;
  try {
    const tr = await user.getIdTokenResult(true);
    return emailVerifiedFromIdTokenClaims(
      tr.claims as Record<string, unknown>,
    );
  } catch {
    return false;
  }
}

/** Keep `users/{uid}.email_verified` aligned with Firebase Auth for Firestore directory queries. */
async function syncEmailVerifiedFromAuthToFirestore(
  uid: string,
  firebaseUser?: User | null,
): Promise<void> {
  const user = firebaseUser ?? auth.currentUser;
  if (!user || user.uid !== uid) return;
  try {
    await user.reload();
  } catch {
    return;
  }
  try {
    await user.getIdToken(true);
  } catch {
    /* continue */
  }
  let authEmailVerified = user.emailVerified;
  try {
    const tr = await user.getIdTokenResult(true);
    if (
      emailVerifiedFromIdTokenClaims(tr.claims as Record<string, unknown>)
    ) {
      authEmailVerified = true;
    }
  } catch {
    /* keep user.emailVerified */
  }

  const emailForPolicy = (user.email ?? "").trim();
  if (
    !authEmailVerified &&
    !isEmailVerificationRequiredForSignIn(emailForPolicy)
  ) {
    console.warn(
      "[auth] Firebase Auth still reports unverified for",
      emailForPolicy,
      "— Firestore email_verified stays false until Auth marks the address verified (use the link for this Firebase project, then sign in again). Sign-in without verification is allowed when the address is on EXPO_PUBLIC_SIGNUP_EMAIL_ALLOWLIST or EXPO_PUBLIC_ALLOW_UNVERIFIED_SIGNIN=true.",
    );
  }

  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const stored = snap.data()?.email_verified;
    if (stored === authEmailVerified) return;
    const payload = {
      email_verified: authEmailVerified,
      updated_at: new Date(),
    };
    try {
      await updateDoc(ref, payload);
    } catch (e1) {
      console.warn(
        "[auth] email_verified updateDoc failed:",
        e1 instanceof Error ? e1.message : e1,
      );
      await new Promise((r) => setTimeout(r, 500));
      await user.reload().catch(() => undefined);
      await user.getIdToken(true).catch(() => undefined);
      let retryVerified = user.emailVerified;
      try {
        const tr2 = await user.getIdTokenResult(true);
        if (
          emailVerifiedFromIdTokenClaims(
            tr2.claims as Record<string, unknown>,
          )
        ) {
          retryVerified = true;
        }
      } catch {
        /* keep */
      }
      const snap2 = await getDoc(ref);
      if (snap2.data()?.email_verified === retryVerified) return;
      try {
        await updateDoc(ref, {
          email_verified: retryVerified,
          updated_at: new Date(),
        });
      } catch (e2) {
        console.warn(
          "[auth] email_verified updateDoc failed after retry:",
          e2 instanceof Error ? e2.message : e2,
        );
      }
    }
  } catch (e) {
    console.warn(
      "[auth] email_verified Firestore sync skipped:",
      e instanceof Error ? e.message : e,
    );
  }
}

export type Sex = "male" | "female";

/** Pending college change — admin must approve before `college_code` updates. */
export interface CollegeShiftRequest {
  requested_college_code: CollegeCode;
  /** Catalog program label for the requested college (students: applied on approve). */
  requested_program: string;
  reason: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: "admin" | "counselor" | "student";
  approval_status?: CounselorApprovalStatus; // for counselors: pending until admin approves
  avatar_url?: string;
  preferred_name?: string;
  /**
   * Canonical college code (COE, CCS, …). Preferred over legacy `department`.
   * @see ../constants/colleges
   */
  college_code?: CollegeCode | string;
  /** @deprecated Use `college_code`. Kept for older Firestore documents. */
  department?: string;
  /** When true, admin queue should show a pending college-shift request. */
  college_shift_pending?: boolean;
  college_shift_request?: CollegeShiftRequest;
  /** Degree program label, e.g. "BS CS (Computer Science)". */
  program?: string;
  year_level?: string;
  student_number?: string;
  /** Mobile or landline for reach-out (counselors & students). */
  contact_number?: string;
  /** Student profile: male | female. Used for future features. */
  sex?: Sex;
  bio?: string;
  session_push_notifications_enabled?: boolean;
  /** Synced from Firebase Auth on sign-in; used to hide unverified counselors from student pickers. */
  email_verified?: boolean;
  created_at: Date;
  updated_at?: Date;
}

export const authService = {
  // Sign up new user
  async signUp(data: SignUpData): Promise<UserProfile> {
    try {
      console.log("🔥 Creating Firebase user:", data.email);

      const contactTrim = data.contactNumber?.trim() ?? "";

      if (data.role === "counselor" || data.role === "student") {
        if (!data.college_code || !isCollegeCode(data.college_code)) {
          throw new Error("Select a valid college before signing up.");
        }
      }

      let studentProgramTrimmed: string | undefined;
      if (data.role === "student") {
        const prog = data.program?.trim() ?? "";
        if (
          !prog ||
          !data.college_code ||
          !isProgramInCollege(data.college_code, prog)
        ) {
          throw new Error(
            "Select a degree program that matches your college before signing up.",
          );
        }
        studentProgramTrimmed = prog;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: data.fullName,
      });

      const userProfile: UserProfile = {
        uid: user.uid,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        email_verified: user.emailVerified,
        ...(data.role === "counselor"
          ? { approval_status: "pending" as const }
          : {}),
        ...(contactTrim ? { contact_number: contactTrim } : {}),
        ...(data.role === "student" || data.role === "counselor"
          ? { college_code: data.college_code as CollegeCode }
          : {}),
        ...(data.role === "student" && studentProgramTrimmed
          ? { program: studentProgramTrimmed }
          : {}),
        created_at: new Date(),
        updated_at: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), userProfile);

      await sendEmailVerification(user);

      // Sign out user immediately to require manual login
      await auth.signOut();

      console.log("✅ User created successfully - please log in");
      return userProfile;
    } catch (error: any) {
      console.error("❌ Signup error:", error.message);
      throw new Error(error.message);
    }
  },

  /**
   * Resend Firebase verification email (link in inbox). Briefly signs in then out.
   */
  async resendRegistrationVerificationEmail(data: SignInData): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    );
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
  },

  // Sign in existing user
  async signIn(data: SignInData): Promise<UserProfile> {
    try {
      console.log("🔥 Signing in user:", data.email);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );

      const user = userCredential.user;
      await user.reload();
      try {
        await user.getIdToken(true);
      } catch {
        /* ignore */
      }

      const emailForPolicy = (user.email ?? data.email).trim();
      if (
        isEmailVerificationRequiredForSignIn(emailForPolicy) &&
        !user.emailVerified
      ) {
        await signOut(auth);
        throw new Error(
          "Verify your email before signing in. Open the link we sent you, then try again. You can resend the email from this screen if needed.",
        );
      }

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("User profile not found");
      }

      let userProfile = userDoc.data() as UserProfile;
      userProfile = await backfillCollegeCodeFromLegacyIfNeeded(
        user.uid,
        userProfile,
      );
      userProfile = await backfillStudentCollegeCodeFromProgramIfNeeded(
        user.uid,
        userProfile,
      );

      await syncEmailVerifiedFromAuthToFirestore(user.uid, user);
      const emailVerifiedEffective = await readAuthEmailVerifiedEffective(user);

      console.log("✅ User signed in successfully");
      return {
        ...userProfile,
        uid: user.uid,
        email: userProfile?.email ?? user.email ?? data.email,
        email_verified: emailVerifiedEffective,
      };
    } catch (error: any) {
      console.error("❌ Signin error:", error.message);
      throw new Error(error.message);
    }
  },

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      console.log("✅ User signed out successfully");
    } catch (error: any) {
      console.error("❌ Signout error:", error.message);
    }
  },

  // Update user profile
  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      console.log("🔥 Updating user profile:", uid, data);

      const updates: any = {
        updated_at: new Date(),
      };

      if (data.full_name !== undefined) {
        updates.full_name = data.full_name;
        const user = auth.currentUser;
        if (user) {
          await updateProfile(user, { displayName: data.full_name });
        }
      }
      if (data.preferred_name !== undefined)
        updates.preferred_name = data.preferred_name;
      if (data.college_code !== undefined) {
        if (isCollegeCode(data.college_code)) {
          updates.college_code = data.college_code;
        }
      } else if (data.department !== undefined) {
        const d = String(data.department).trim();
        if (isCollegeCode(d)) updates.college_code = d;
      }
      if (data.program !== undefined) updates.program = data.program;
      if (data.year_level !== undefined) updates.year_level = data.year_level;
      if (data.student_number !== undefined)
        updates.student_number = data.student_number;
      if (data.contact_number !== undefined)
        updates.contact_number = data.contact_number;
      if (data.sex !== undefined) updates.sex = data.sex;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
      if (data.session_push_notifications_enabled !== undefined) {
        updates.session_push_notifications_enabled =
          data.session_push_notifications_enabled;
      }

      await updateDoc(doc(db, "users", uid), updates);
      const refreshed = (await getDoc(doc(db, "users", uid))).data() as
        | UserProfile
        | undefined;
      if (refreshed) {
        await backfillStudentCollegeCodeFromProgramIfNeeded(uid, refreshed);
      }
      console.log("✅ User profile updated successfully");
    } catch (error: any) {
      console.error("❌ Update profile error:", error.message);
      throw new Error(error.message);
    }
  },

  // Upload avatar and update profile
  async uploadAvatar(uid: string, imageUri: string): Promise<string> {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError("Failed to fetch image"));
        xhr.responseType = "blob";
        xhr.open("GET", imageUri, true);
        xhr.send();
      });

      const storageRef = ref(storage, `avatars/${uid}`);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg",
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await this.updateProfile(uid, { avatar_url: downloadUrl });
      return downloadUrl;
    } catch (error: any) {
      console.error("❌ Avatar upload error:", error.message);
      throw new Error(error.message);
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return null;
      let profile = userDoc.data() as UserProfile;
      profile = await backfillCollegeCodeFromLegacyIfNeeded(user.uid, profile);
      profile = await backfillStudentCollegeCodeFromProgramIfNeeded(
        user.uid,
        profile,
      );
      await syncEmailVerifiedFromAuthToFirestore(user.uid, user);
      const emailVerifiedEffective = await readAuthEmailVerifiedEffective(user);
      return {
        ...profile,
        uid: user.uid,
        email: profile?.email ?? user.email ?? "",
        email_verified: emailVerifiedEffective,
      };
    } catch (error: any) {
      console.error("❌ Get current user error:", error.message);
      return null;
    }
  },

  // Get Firebase Auth user
  getCurrentFirebaseUser(): User | null {
    return auth.currentUser;
  },

  // Admin: Update counselor approval status (optionally assign college on approve)
  async updateCounselorApproval(
    uid: string,
    approval_status: CounselorApprovalStatus,
    options?: { college_code?: CollegeCode },
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {
        approval_status,
        updated_at: new Date(),
      };
      if (
        approval_status === "approved" &&
        options?.college_code &&
        isCollegeCode(options.college_code)
      ) {
        updates.college_code = options.college_code;
      }
      await updateDoc(doc(db, "users", uid), updates);
      console.log("✅ Counselor approval updated:", uid, approval_status);
    } catch (error: any) {
      console.error("❌ Update counselor approval error:", error.message);
      throw new Error(error.message);
    }
  },
};
