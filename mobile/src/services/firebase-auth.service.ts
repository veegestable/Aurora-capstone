// Firebase Authentication Service for Aurora
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'counselor' | 'student';
}

export interface SignInData {
  email: string;
  password: string;
}

export type CounselorApprovalStatus = 'pending' | 'approved' | 'rejected';

export type Sex = 'male' | 'female';

export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: 'admin' | 'counselor' | 'student';
  approval_status?: CounselorApprovalStatus; // for counselors: pending until admin approves
  avatar_url?: string;
  preferred_name?: string;
  /** College / school unit (e.g. CCS). */
  department?: string;
  /** Degree program label, e.g. "BS CS (Computer Science)". */
  program?: string;
  year_level?: string;
  student_number?: string;
  /** Student profile: male | female. Used for future features. */
  sex?: Sex;
  bio?: string;
  session_push_notifications_enabled?: boolean;
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

      // Create user profile in Firestore (omit optional fields instead of undefined — Firestore rejects undefined)
      const userProfile: UserProfile = {
        uid: user.uid,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        ...(data.role === 'counselor' ? { approval_status: 'pending' as const } : {}),
        created_at: new Date(),
        updated_at: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      // Sign out user immediately to require manual login
      await auth.signOut();

      console.log('✅ User created successfully - please log in');
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
    }
  },

  // Update user profile
  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      console.log('🔥 Updating user profile:', uid, data);

      const updates: any = {
        updated_at: new Date()
      };

      if (data.full_name !== undefined) {
        updates.full_name = data.full_name;
        const user = auth.currentUser;
        if (user) {
          await updateProfile(user, { displayName: data.full_name });
        }
      }
      if (data.preferred_name !== undefined) updates.preferred_name = data.preferred_name;
      if (data.department !== undefined) updates.department = data.department;
      if (data.program !== undefined) updates.program = data.program;
      if (data.year_level !== undefined) updates.year_level = data.year_level;
      if (data.student_number !== undefined) updates.student_number = data.student_number;
      if (data.sex !== undefined) updates.sex = data.sex;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
      if (data.session_push_notifications_enabled !== undefined) {
        updates.session_push_notifications_enabled = data.session_push_notifications_enabled;
      }

      await updateDoc(doc(db, 'users', uid), updates);
      console.log('✅ User profile updated successfully');
    } catch (error: any) {
      console.error('❌ Update profile error:', error.message);
      throw new Error(error.message);
    }
  },

  // Upload avatar and update profile
  async uploadAvatar(uid: string, imageUri: string): Promise<string> {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError('Failed to fetch image'));
        xhr.responseType = 'blob';
        xhr.open('GET', imageUri, true);
        xhr.send();
      });

      const storageRef = ref(storage, `avatars/${uid}`);
      const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await this.updateProfile(uid, { avatar_url: downloadUrl });
      return downloadUrl;
    } catch (error: any) {
      console.error('❌ Avatar upload error:', error.message);
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
  },

  // Admin: Update counselor approval status
  async updateCounselorApproval(uid: string, approval_status: CounselorApprovalStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        approval_status,
        updated_at: new Date()
      });
      console.log('✅ Counselor approval updated:', uid, approval_status);
    } catch (error: any) {
      console.error('❌ Update counselor approval error:', error.message);
      throw new Error(error.message);
    }
  }
};