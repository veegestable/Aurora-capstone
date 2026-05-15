import { FirebaseError } from 'firebase/app'

/** User-facing copy for email/password Firebase Auth errors (no SDK jargon). */
const EMAIL_PASSWORD_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':
    'The email or password you entered is incorrect. Please try again.',
  'auth/invalid-login-credentials':
    'The email or password you entered is incorrect. Please try again.',
  'auth/wrong-password':
    'The email or password you entered is incorrect. Please try again.',
  'auth/user-not-found':
    'The email or password you entered is incorrect. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled':
    'This account has been disabled. Contact support if you need help.',
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed':
    "Couldn't reach the server. Check your connection and try again.",
  'auth/email-already-in-use':
    'An account with this email already exists. Try signing in instead.',
  'auth/weak-password':
    'Choose a stronger password (at least 6 characters).',
  'auth/operation-not-allowed':
    "Email sign-in isn't available right now. Please try again later.",
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/invalid-password': 'Please enter a valid password.',
  'auth/internal-error': 'Something went wrong. Please try again.',
}

const GENERIC_AUTH_FAILURE = 'Something went wrong. Please try again.'

function messageForAuthCode(code: string): string | undefined {
  return EMAIL_PASSWORD_AUTH_MESSAGES[code]
}

function extractAuthCodeFromMessage(message: string): string | undefined {
  const paren = message.match(/\((auth\/[^)]+)\)/)
  if (paren) return paren[1]
  if (message.startsWith('auth/')) return message.split(/\s/)[0]
  return undefined
}

function looksLikeFirebaseSdkMessage(message: string): boolean {
  return (
    message.includes('Firebase:') ||
    /\((auth\/[^)]+)\)/.test(message) ||
    message.startsWith('auth/')
  )
}

/** Maps Firebase email/password errors to plain-language messages; keeps app-thrown errors as-is. */
export function toUserFacingEmailAuthError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    const mapped = messageForAuthCode(err.code)
    if (mapped) return new Error(mapped)
    if (err.code.startsWith('auth/')) return new Error(GENERIC_AUTH_FAILURE)
  }

  if (err instanceof Error) {
    const fromMessage = extractAuthCodeFromMessage(err.message)
    if (fromMessage) {
      const mapped = messageForAuthCode(fromMessage)
      if (mapped) return new Error(mapped)
    }
    if (looksLikeFirebaseSdkMessage(err.message)) {
      return new Error(GENERIC_AUTH_FAILURE)
    }
    return err
  }

  return new Error(GENERIC_AUTH_FAILURE)
}