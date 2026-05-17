import { FirebaseError } from 'firebase/app'
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../../../config/firebase'
import { SignInData } from '../types'
import { toUserFacingEmailAuthError } from '../../../utils/firebase-auth-errors'
import { resendRegistrationVerificationTrusted } from '../../trusted-backend.service'

function shouldFallbackToClientResend(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false
  return (
    error.code === 'functions/not-found' ||
    error.code === 'functions/unimplemented' ||
    error.code === 'functions/internal'
  )
}

async function resendVerificationOnClient(data: SignInData): Promise<void> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  )
  await sendEmailVerification(userCredential.user)
  await firebaseSignOut(auth)
}

function toResendVerificationError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    if (err.code === 'functions/resource-exhausted') {
      return new Error(
        err.message ||
          'Too many verification emails sent. Please wait and try again.',
      )
    }
    if (err.code === 'functions/permission-denied') {
      return new Error(
        'The email or password you entered is incorrect. Please try again.',
      )
    }
    if (err.code === 'functions/invalid-argument') {
      return new Error(
        'Enter the same email and password you used when signing up.',
      )
    }
    if (err.code === 'functions/unavailable') {
      return new Error(
        'Could not send verification email right now. Please try again later.',
      )
    }
  }
  return toUserFacingEmailAuthError(err)
}

/** Resend verification email via rate-limited Cloud Function (client fallback if not deployed). */
export const resendRegistrationVerificationEmail = async (
  data: SignInData,
): Promise<void> => {
  try {
    await resendRegistrationVerificationTrusted({
      email: data.email.trim(),
      password: data.password,
    })
  } catch (error: unknown) {
    if (shouldFallbackToClientResend(error)) {
      try {
        await resendVerificationOnClient(data)
        return
      } catch (fallbackErr: unknown) {
        console.error('❌ Resend verification fallback error:', fallbackErr)
        throw toUserFacingEmailAuthError(fallbackErr)
      }
    }
    console.error('❌ Resend verification error:', error)
    throw toResendVerificationError(error)
  }
}
