import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { SignUpData, UserProfile } from '../types';

export const signUp = async (data: SignUpData): Promise<UserProfile> => {
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
    
    // Sign out user immediately to require manual login
    await auth.signOut();
    
    console.log('✅ User created successfully - please log in');
    return userProfile;
  } catch (error: any) {
    console.error('❌ Signup error:', error.message);
    throw new Error(error.message);
  }
};
