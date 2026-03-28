import { signUp } from './auth/signUp'
import { signIn } from './auth/signIn'
import { signOut } from './auth/signOut'
import { getCurrentUser } from './user/getCurrentUser'
import { getCurrentFirebaseUser } from './user/getCurrentFirebaseUser'
import { updateProfile } from './user/updateProfile'
import { uploadAvatar } from './user/uploadAvatar'
import { resetPassword } from './auth/resetPassword'

export * from './types'

export const authService = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getCurrentFirebaseUser,
  updateProfile,
  uploadAvatar,
  resetPassword,
}
