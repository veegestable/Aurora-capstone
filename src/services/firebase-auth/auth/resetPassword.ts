import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../../config/firebase'

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
    console.log('✅ Password reset email sent successfully')
  } catch (error: any) {
    console.error('❌ Reset password error:', error.message)
    throw new Error(error.message)
  }
}