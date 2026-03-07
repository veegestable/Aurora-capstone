import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out successfully');
  } catch (error: any) {
    console.error('❌ Signout error:', error.message);
    throw new Error(error.message);
  }
};
