import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../../config/firebase'

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
    console.log('✅ Password reset email sent successfully')
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Reset password error:', msg)
    throw new Error(msg)
  }
}