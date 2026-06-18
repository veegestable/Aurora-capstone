import { FirebaseError } from 'firebase/app'
import { toUserFacingEmailAuthError } from '../../../utils/firebase-auth-errors'
import {
  getRetryAfterSecondsFromError,
  stripRetrySecondsFromMessage,
} from '../../../utils/rateLimitError'

export function shouldFallbackToClientPasswordReset(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false
  return (
    error.code === 'functions/not-found' ||
    error.code === 'functions/unimplemented' ||
    error.code === 'functions/internal'
  )
}

export function toUserFacingPasswordResetError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    if (err.code === 'functions/resource-exhausted') {
      const raw =
        err.message || 'Too many reset attempts. Please wait and try again.'
      return new Error(stripRetrySecondsFromMessage(raw))
    }
    if (err.code === 'functions/invalid-argument') {
      return new Error(err.message || 'Please enter a valid email address.')
    }
    if (err.code === 'functions/unavailable') {
      return new Error(
        err.message ||
          'Could not send reset email right now. Please try again later.',
      )
    }
  }
  return toUserFacingEmailAuthError(err)
}

export function getPasswordResetRetryAfterSeconds(err: unknown): number | null {
  return getRetryAfterSecondsFromError(err)
}
