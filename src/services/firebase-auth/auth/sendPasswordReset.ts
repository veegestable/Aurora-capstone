import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../config/firebase'
import { sendPasswordResetTrusted } from '../../trusted-backend.service'
import {
  shouldFallbackToClientPasswordReset,
  toUserFacingPasswordResetError,
} from './passwordResetTrustedErrors'

export async function sendPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase()
  try {
    await sendPasswordResetTrusted({ email: trimmed })
  } catch (trustedErr: unknown) {
    if (shouldFallbackToClientPasswordReset(trustedErr)) {
      try {
        await sendPasswordResetEmail(auth, trimmed)
        return
      } catch (clientErr: unknown) {
        throw toUserFacingPasswordResetError(clientErr)
      }
    }
    throw toUserFacingPasswordResetError(trustedErr)
  }
}
