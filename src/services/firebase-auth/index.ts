import { signUp } from './auth/signUp';
import { signIn } from './auth/signIn';
import { signOut } from './auth/signOut';
import { getCurrentUser } from './user/getCurrentUser';
import { getCurrentFirebaseUser } from './user/getCurrentFirebaseUser';

export * from './types';

export const authService = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getCurrentFirebaseUser
};
