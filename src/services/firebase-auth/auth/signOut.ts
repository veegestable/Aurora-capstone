import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../../../config/firebase'

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth)
    console.log('✅ User signed out successfully')
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Signout error:', msg)
    throw new Error(msg)
  }
}
