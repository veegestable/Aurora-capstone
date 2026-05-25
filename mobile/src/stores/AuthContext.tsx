import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { AppState } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { authService, UserProfile, CollegeShiftRequest } from "../services/firebase-auth.service";
import {
  type CollegeCode,
  isCollegeCode,
} from "../constants/colleges";
import { isProgramInCollege } from "../constants/college-programs-iit";
import {
  setMyPresenceOfflineNow,
  startMyPresence,
} from "../services/firebase-presence.service";
import {
  logUserLogin,
  logUserLogoutCounselorOrStudent,
  clearActivityThrottleForUser,
} from "../services/user-activity.service";
import {
  clearAuthSessionIdleTracking,
  getAuthSessionMaxIdleMs,
  isAuthSessionIdleExpired,
  touchAuthSessionLastBackgroundNow,
} from "../utils/auth-session-idle";

export type CounselorApprovalStatus = "pending" | "approved" | "rejected";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "counselor" | "student";
  approval_status?: CounselorApprovalStatus;
  preferred_name?: string;
  /** Canonical college code (COE, CCS, …). */
  college_code?: string;
  /** @deprecated Legacy field; use college_code. */
  department?: string;
  college_shift_pending?: boolean;
  college_shift_request?: CollegeShiftRequest;
  program?: string;
  year_level?: string;
  student_number?: string;
  contact_number?: string;
  /** male | female. Used for future features. */
  sex?: "male" | "female";
  bio?: string;
  avatar_url?: string;
  session_push_notifications_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "counselor" | "student",
    contactNumber: string,
    collegeCode: string,
    /** Student catalog program; ignored for counselor. */
    program?: string,
  ) => Promise<{ success: boolean; message: string }>;
  resendRegistrationVerificationEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  updateUser: (data: {
    full_name?: string;
    preferred_name?: string;
    college_code?: string;
    /** @deprecated Maps to college_code when value is a valid code. */
    department?: string;
    program?: string;
    year_level?: string;
    student_number?: string;
    contact_number?: string;
    sex?: "male" | "female";
    bio?: string;
    avatar_url?: string;
    session_push_notifications_enabled?: boolean;
  }) => Promise<void>;
  uploadAvatar: (imageUri: string) => Promise<string>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert UserProfile to User
/** Apply live Firestore user-doc fields onto in-memory auth user. */
function mergeUserDocFromFirestore(
  prev: User,
  data: Record<string, unknown>,
): User {
  const collegeCodeRaw = data.college_code ?? data.department;
  const college_code =
    typeof collegeCodeRaw === "string" && collegeCodeRaw.trim()
      ? collegeCodeRaw.trim()
      : prev.college_code;

  const shiftPending = data.college_shift_pending === true;
  const req = data.college_shift_request;
  const college_shift_request =
    shiftPending &&
    req &&
    typeof req === "object" &&
    !Array.isArray(req)
      ? (req as CollegeShiftRequest)
      : undefined;

  const approval_status =
    data.approval_status === "pending" ||
    data.approval_status === "approved" ||
    data.approval_status === "rejected"
      ? data.approval_status
      : prev.approval_status;

  return {
    ...prev,
    full_name:
      typeof data.full_name === "string" ? data.full_name : prev.full_name,
    preferred_name:
      typeof data.preferred_name === "string"
        ? data.preferred_name
        : prev.preferred_name,
    college_code,
    department:
      typeof data.department === "string" ? data.department : prev.department,
    college_shift_pending: shiftPending,
    college_shift_request,
    program: typeof data.program === "string" ? data.program : prev.program,
    year_level:
      typeof data.year_level === "string" ? data.year_level : prev.year_level,
    student_number:
      typeof data.student_number === "string"
        ? data.student_number
        : prev.student_number,
    contact_number:
      typeof data.contact_number === "string"
        ? data.contact_number
        : prev.contact_number,
    sex:
      data.sex === "male" || data.sex === "female" ? data.sex : prev.sex,
    bio: typeof data.bio === "string" ? data.bio : prev.bio,
    avatar_url:
      typeof data.avatar_url === "string" ? data.avatar_url : prev.avatar_url,
    approval_status,
    session_push_notifications_enabled:
      typeof data.session_push_notifications_enabled === "boolean"
        ? data.session_push_notifications_enabled
        : prev.session_push_notifications_enabled,
  };
}

const convertUserProfile = (userProfile: UserProfile): User => {
  return {
    id: userProfile.uid,
    full_name: userProfile.full_name,
    email: userProfile.email,
    role: userProfile.role,
    approval_status: userProfile.approval_status,
    preferred_name: userProfile.preferred_name,
    college_code:
      userProfile.college_code != null &&
      String(userProfile.college_code).trim()
        ? String(userProfile.college_code).trim()
        : undefined,
    department: userProfile.department,
    college_shift_pending: userProfile.college_shift_pending,
    college_shift_request: userProfile.college_shift_request,
    program: userProfile.program,
    year_level: userProfile.year_level,
    student_number: userProfile.student_number,
    contact_number: userProfile.contact_number,
    sex: userProfile.sex,
    bio: userProfile.bio,
    avatar_url: userProfile.avatar_url,
    session_push_notifications_enabled:
      userProfile.session_push_notifications_enabled,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        void touchAuthSessionLastBackgroundNow();
      }
    });

    console.log("🔥 Setting up Firebase auth listener...");

    let stopPresence: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔥 Auth state changed:", firebaseUser?.email);

      stopPresence?.();
      stopPresence = undefined;

      if (firebaseUser) {
        const idleExpired = await isAuthSessionIdleExpired();
        if (idleExpired) {
          try {
            await authService.signOut();
          } catch {
            /* ignore */
          }
          await clearAuthSessionIdleTracking();
          setUser(null);
          setLoading(false);
          return;
        }
      }

      // Presence must use Firebase Auth uid (RTDB rules: auth.uid === $uid). Start as soon as
      // Auth is ready — do not wait for Firestore profile, or RTDB never gets writes.
      if (firebaseUser?.uid) {
        stopPresence = startMyPresence(firebaseUser.uid);
      }

      if (firebaseUser) {
        try {
          const userProfile = await authService.getCurrentUser();
          if (userProfile) {
            setUser(convertUserProfile(userProfile));
            console.log("✅ User authenticated:", userProfile.email);
          } else {
            setUser(null);
            console.warn(
              "⚠️ Signed in to Auth but no Firestore user profile — check users/{uid}",
            );
          }
        } catch (error) {
          console.error("❌ Error getting user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        console.log("🔐 User signed out");
      }

      setLoading(false);
    });

    return () => {
      stopPresence?.();
      appStateSub.remove();
      unsubscribe();
    };
  }, []);

  // Keep profile fields (college shift, college code, approval) in sync without re-login.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        setUser((prev) => {
          if (!prev || prev.id !== uid) return prev;
          return mergeUserDocFromFirestore(prev, data);
        });
      },
      (err) => {
        console.warn("[Auth] user profile snapshot error:", err);
      },
    );

    return () => unsubscribe();
  }, [user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log("🔥 Signing in user:", email);
      const userProfile = await authService.signIn({ email, password });

      setUser(convertUserProfile(userProfile));
      logUserLogin({
        userId: userProfile.uid,
        role: userProfile.role,
        displayName: userProfile.full_name ?? "",
        email: userProfile.email ?? "",
      });
      if (getAuthSessionMaxIdleMs() > 0) {
        void touchAuthSessionLastBackgroundNow();
      }
      console.log("✅ Sign in successful:", userProfile.email);
    } catch (error) {
      console.error("❌ Sign in error:", error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "counselor" | "student",
    contactNumber: string,
    collegeCode: string,
    program?: string,
  ) => {
    try {
      console.log("🔥 Signing up user:", email);
      const cc =
        (role === "counselor" || role === "student") &&
        isCollegeCode(collegeCode.trim())
          ? (collegeCode.trim() as CollegeCode)
          : undefined;
      const prog =
        role === "student" && cc && program?.trim()
          ? program.trim()
          : undefined;
      if (role === "student" && cc && (!prog || !isProgramInCollege(cc, prog))) {
        return {
          success: false,
          message: "Choose a degree program that matches your college.",
        };
      }
      await authService.signUp({
        email,
        password,
        fullName,
        role,
        contactNumber:
          role === "counselor" || role === "student"
            ? contactNumber.trim()
            : undefined,
        college_code: cc,
        ...(role === "student" && prog ? { program: prog } : {}),
      });

      console.log("✅ Sign up successful - account created for:", email);

      return {
        success: true,
        message:
          "Account created. Check your email for the verification link, then sign in.",
      };
    } catch (error) {
      console.error("❌ Sign up error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sign up failed",
      };
    }
  }, []);

  const resendRegistrationVerificationEmail = useCallback(async (
    email: string,
    password: string,
  ) => {
    try {
      await authService.resendRegistrationVerificationEmail({
        email: email.trim(),
        password,
      });
      return {
        success: true,
        message: "Verification email sent again. Check your inbox.",
      };
    } catch (error) {
      console.error("❌ Resend verification email error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not resend verification email",
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      const currentUser = user;
      if (uid && currentUser && (currentUser.role === "counselor" || currentUser.role === "student")) {
        await logUserLogoutCounselorOrStudent({
          userId: uid,
          role: currentUser.role,
          displayName: currentUser.full_name ?? "",
          email: currentUser.email ?? "",
        });
      }
      if (uid) {
        try {
          await setMyPresenceOfflineNow(uid);
        } catch (e) {
          console.warn("[presence] Could not set offline before sign out:", e);
        }
      }
      if (uid) clearActivityThrottleForUser(uid);
      await authService.signOut();
      await clearAuthSessionIdleTracking();
      setUser(null);
      console.log("✅ Sign out successful");
    } catch (error) {
      console.error("❌ Sign out error:", error);
    }
  }, [user]);

  const updateUser = useCallback(async (data: {
    full_name?: string;
    preferred_name?: string;
    college_code?: string;
    department?: string;
    program?: string;
    year_level?: string;
    student_number?: string;
    contact_number?: string;
    sex?: "male" | "female";
    bio?: string;
    avatar_url?: string;
    session_push_notifications_enabled?: boolean;
  }) => {
    if (!user) return;
    try {
      await authService.updateProfile(user.id, data);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
      console.log("✅ User updated locally");
    } catch (error) {
      console.error("❌ Update user error:", error);
      throw error;
    }
  }, [user]);

  const uploadAvatar = useCallback(async (imageUri: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const url = await authService.uploadAvatar(user.id, imageUri);
    setUser((prev) => (prev ? { ...prev, avatar_url: url } : null));
    return url;
  }, [user]);

  const refreshUserProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const userProfile = await authService.getCurrentUser();
      if (userProfile) {
        setUser(convertUserProfile(userProfile));
      }
    } catch (e) {
      console.error("❌ refreshUserProfile:", e);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    resendRegistrationVerificationEmail,
    signOut,
    updateUser,
    uploadAvatar,
    refreshUserProfile,
  }), [user, loading, signIn, signUp, resendRegistrationVerificationEmail, signOut, updateUser, uploadAvatar, refreshUserProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
