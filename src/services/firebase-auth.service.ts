// Firebase Authentication Service for Aurora
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'counselor';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: 'student' | 'counselor';
  avatar_url?: string;
  created_at: Date;
  updated_at?: Date;
}

export const authService = {
  // Sign up new user
  async signUp(data: SignUpData): Promise<UserProfile> {
    try {
      console.log('🔥 Creating Firebase user:', data.email);
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );
      
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, {
        displayName: data.fullName
      });
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      console.log('✅ User created successfully');
      return userProfile;
    } catch (error: any) {
      console.error('❌ Signup error:', error.message);
      throw new Error(error.message);
    }
  },

  // Sign in existing user
  async signIn(data: SignInData): Promise<UserProfile> {
    try {
      console.log('🔥 Signing in user:', data.email);
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      const user = userCredential.user;
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userProfile = userDoc.data() as UserProfile;
      console.log('✅ User signed in successfully');
      return userProfile;
    } catch (error: any) {
      console.error('❌ Signin error:', error.message);
      throw new Error(error.message);
    }
  },

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      console.log('✅ User signed out successfully');
    } catch (error: any) {
      console.error('❌ Signout error:', error.message);
      throw new Error(error.message);
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return userDoc.exists() ? userDoc.data() as UserProfile : null;
    } catch (error: any) {
      console.error('❌ Get current user error:', error.message);
      return null;
    }
  },

  // Get Firebase Auth user
  getCurrentFirebaseUser(): User | null {
    return auth.currentUser;
  }
};