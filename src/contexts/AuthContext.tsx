import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, UserResponse, AuthResponse } from '../services/auth.service';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert UserResponse to User
const convertUserResponse = (userResponse: UserResponse): User => {
  return {
    id: userResponse.id,
    full_name: userResponse.full_name,
    email: userResponse.email,
    role: userResponse.role as 'student' | 'counselor' // Type assertion
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    console.log('Initializing auth...');
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const currentUser = await authService.getCurrentUser();
        console.log('Current user:', currentUser);
        setUser(convertUserResponse(currentUser));
      }
    } catch (error) {
      console.log('Auth initialization error:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      const response: AuthResponse = await authService.signIn({ email, password });
      
      localStorage.setItem('token', response.token);
      setUser(convertUserResponse(response.user));
      console.log('✅ Sign in successful:', response.user);
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'counselor') => {
    try {
      console.log('📝 Signing up user:', email);
      const response = await authService.signUp({
        email,
        password,
        fullName,
        role
      });
      
      console.log('✅ Sign up successful - account created for:', email);
      
      // DON'T auto-login after signup
      // Just return success message
      return {
        success: true,
        message: 'Account created successfully! Please sign in with your credentials.'
      };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
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
