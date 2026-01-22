import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService, UserProfile } from '../services/firebase-auth.service';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'counselor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'counselor') => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  updateUser: (data: { full_name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert UserProfile to User
const convertUserProfile = (userProfile: UserProfile): User => {
  return {
    id: userProfile.uid,
    full_name: userProfile.full_name,
    email: userProfile.email,
    role: userProfile.role
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...');

    // Auth subscriptions in React Native are similar to web
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email);

      if (firebaseUser) {
        // User is signed in
        try {
          const userProfile = await authService.getCurrentUser();
          if (userProfile) {
            setUser(convertUserProfile(userProfile));
            console.log('✅ User authenticated:', userProfile.email);
          }
        } catch (error) {
          console.error('❌ Error getting user profile:', error);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
        console.log('🔐 User signed out');
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
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

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'counselor') => {
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
      await authService.signOut();
      setUser(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const updateUser = async (data: { full_name?: string }) => {
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser
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
