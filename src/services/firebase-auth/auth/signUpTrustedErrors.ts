import { FirebaseError } from 'firebase/app'
import { toUserFacingEmailAuthError } from '../../../utils/firebase-auth-errors'

export function shouldFallbackToClientSignUp(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false
  return (
    error.code === 'functions/not-found' ||
    error.code === 'functions/unimplemented' ||
    error.code === 'functions/internal'
  )
}

export function toUserFacingSignUpTrustedError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    if (err.code === 'functions/resource-exhausted') {
      return new Error(
        err.message ||
          'Too many sign-up attempts. Please wait and try again later.',
      )
    }
    if (err.code === 'functions/already-exists') {
      return new Error(
        err.message ||
          'An account with this email already exists. Try signing in instead.',
      )
    }
    if (err.code === 'functions/invalid-argument') {
      return new Error(err.message || 'Please check your sign-up details and try again.')
    }
    if (err.code === 'functions/unavailable') {
      return new Error(
        err.message ||
          'Could not complete registration right now. Please try again later.',
      )
    }
    if (err.code === 'functions/permission-denied') {
      return new Error(
        err.message || 'Registration is not allowed. Please contact support.',
      )
    }
  }
  return toUserFacingEmailAuthError(err)
}
