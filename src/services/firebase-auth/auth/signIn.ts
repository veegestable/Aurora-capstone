import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
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
import { syncAllowlistedEmailVerificationTrusted } from '../../trusted-backend.service'

async function ensureEmailVerifiedForSignIn(
  user: User,
  emailForPolicy: string,
): Promise<boolean> {
  if (!isEmailVerificationRequiredForSignIn(emailForPolicy)) {
    return true
  }

  let verified = await readAuthEmailVerifiedEffective(user)
  if (verified) return true

  try {
    const { synced } = await syncAllowlistedEmailVerificationTrusted()
    if (synced) {
      await user.reload()
      try {
        await user.getIdToken(true)
      } catch {
        /* ignore */
      }
      verified = await readAuthEmailVerifiedEffective(user)
    }
  } catch (e) {
    console.warn(
      '[signIn] allowlist verification sync skipped:',
      e instanceof Error ? e.message : e,
    )
  }

  return verified
}

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
    const verified = await ensureEmailVerifiedForSignIn(user, emailForPolicy)
    if (!verified) {
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
