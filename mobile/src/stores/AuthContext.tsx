import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService, UserProfile } from '../services/firebase-auth.service';
import { setMyPresenceOfflineNow, startMyPresence } from '../services/firebase-presence.service';

export type CounselorApprovalStatus = 'pending' | 'approved' | 'rejected';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'counselor' | 'student';
  approval_status?: CounselorApprovalStatus;
  preferred_name?: string;
  department?: string;
  program?: string;
  year_level?: string;
  student_number?: string;
  /** male | female. Used for future features. */
  sex?: 'male' | 'female';
  bio?: string;
  avatar_url?: string;
  session_push_notifications_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'counselor' | 'student') => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  updateUser: (data: { full_name?: string; preferred_name?: string; department?: string; program?: string; year_level?: string; student_number?: string; sex?: 'male' | 'female'; bio?: string; avatar_url?: string; session_push_notifications_enabled?: boolean }) => Promise<void>;
  uploadAvatar: (imageUri: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert UserProfile to User
const convertUserProfile = (userProfile: UserProfile): User => {
  return {
    id: userProfile.uid,
    full_name: userProfile.full_name,
    email: userProfile.email,
    role: userProfile.role,
    approval_status: userProfile.approval_status,
    preferred_name: userProfile.preferred_name,
    department: userProfile.department,
    program: userProfile.program,
    year_level: userProfile.year_level,
    student_number: userProfile.student_number,
    sex: userProfile.sex,
    bio: userProfile.bio,
    avatar_url: userProfile.avatar_url,
    session_push_notifications_enabled: userProfile.session_push_notifications_enabled
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...');

    let stopPresence: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email);

      stopPresence?.();
      stopPresence = undefined;

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
            console.log('✅ User authenticated:', userProfile.email);
          } else {
            setUser(null);
            console.warn('⚠️ Signed in to Auth but no Firestore user profile — check users/{uid}');
          }
        } catch (error) {
          console.error('❌ Error getting user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        console.log('🔐 User signed out');
      }

      setLoading(false);
    });

    return () => {
      stopPresence?.();
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔥 Signing in user:', email);
      const userProfile = await authService.signIn({ email, password });

      setUser(convertUserProfile(userProfile));
      console.log('✅ Sign in successful:', userProfile.email);
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'counselor' | 'student') => {
    try {
      console.log('🔥 Signing up user:', email);
      await authService.signUp({
        email,
        password,
        fullName,
        role
      });

      // Don't set user - they need to log in manually
      console.log('✅ Sign up successful - account created for:', email);

      return {
        success: true,
        message: 'Account created successfully! Please log in with your credentials.'
      };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sign up failed'
      };
    }
  };

  const signOut = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await setMyPresenceOfflineNow(uid);
        } catch (e) {
          console.warn('[presence] Could not set offline before sign out:', e);
        }
      }
      await authService.signOut();
      setUser(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const updateUser = async (data: { full_name?: string; preferred_name?: string; department?: string; program?: string; year_level?: string; student_number?: string; sex?: 'male' | 'female'; bio?: string; avatar_url?: string; session_push_notifications_enabled?: boolean }) => {
    if (!user) return;
    try {
      await authService.updateProfile(user.id, data);
      setUser(prev => prev ? { ...prev, ...data } : null);
      console.log('✅ User updated locally');
    } catch (error) {
      console.error('❌ Update user error:', error);
      throw error;
    }
  };

  const uploadAvatar = async (imageUri: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const url = await authService.uploadAvatar(user.id, imageUri);
    setUser(prev => prev ? { ...prev, avatar_url: url } : null);
    return url;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
    uploadAvatar
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
