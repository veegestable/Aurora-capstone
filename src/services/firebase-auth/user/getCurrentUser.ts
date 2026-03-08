import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { UserProfile } from '../types';

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() ? userDoc.data() as UserProfile : null;
  } catch (error: any) {
    console.error('❌ Get current user error:', error.message);
    return null;
  }
};
