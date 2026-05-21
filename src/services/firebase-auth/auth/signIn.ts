import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'
import { SignInData, UserProfile } from '../types'
import { toUserFacingEmailAuthError } from '../../../utils/firebase-auth-errors'
import {
  isEmailVerificationRequiredForSignIn,
  readAuthEmailVerifiedEffective,
  syncEmailVerifiedFromAuthToFirestore,
} from '../emailVerificationSync'

export const signIn = async (data: SignInData): Promise<UserProfile> => {
  try {
    console.log('🔥 Signing in user:', data.email)

    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    )

    const user = userCredential.user
    await user.reload()
    try {
      await user.getIdToken(true)
    } catch {
      /* ignore */
    }

    const emailForPolicy = (user.email ?? data.email).trim()
    if (
      isEmailVerificationRequiredForSignIn(emailForPolicy) &&
      !user.emailVerified
    ) {
      await firebaseSignOut(auth)
      throw new Error(
        'Verify your email before signing in. Open the link we sent you, then try again. You can resend the email from this screen if needed.',
      )
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid))

    if (!userDoc.exists()) {
      await firebaseSignOut(auth)
      throw new Error('User profile not found')
    }

    const userProfile = userDoc.data() as UserProfile

    await syncEmailVerifiedFromAuthToFirestore(user.uid, user)
    const emailVerifiedEffective = await readAuthEmailVerifiedEffective(user)

    console.log('✅ User signed in successfully')
    return {
      ...userProfile,
      uid: user.uid,
      email: userProfile.email ?? user.email ?? data.email,
      email_verified: emailVerifiedEffective,
    }
  } catch (error: unknown) {
    console.error('❌ Signin error:', error)
    if (error instanceof Error && error.message.includes('Verify your email')) {
      throw error
    }
    throw toUserFacingEmailAuthError(error)
  }
}
