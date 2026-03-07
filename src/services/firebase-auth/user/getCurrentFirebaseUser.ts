import { User } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export const getCurrentFirebaseUser = (): User | null => {
  return auth.currentUser;
};
