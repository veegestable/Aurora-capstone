import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { SignInData, UserProfile } from '../types';

export const signIn = async (data: SignInData): Promise<UserProfile> => {
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
};
