import type { User } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import {
  firestoreEmailVerifiedEffective,
  isEmailVerificationRequiredForSignIn,
} from '../../utils/signupEmailPolicy'

export function emailVerifiedFromIdTokenClaims(
  claims: Record<string, unknown> | undefined,
): boolean {
  if (!claims) return false
  const v = claims.email_verified
  return v === true || v === 'true'
}

/** Best-effort: Auth user + ID token `email_verified` claim. */
export async function readAuthEmailVerifiedEffective(user: User): Promise<boolean> {
  try {
    await user.reload()
  } catch {
    /* ignore */
  }
  let authVerified = user.emailVerified
  try {
    const tr = await user.getIdTokenResult(true)
    if (
      emailVerifiedFromIdTokenClaims(tr.claims as Record<string, unknown>)
    ) {
      authVerified = true
    }
  } catch {
    /* keep user.emailVerified */
  }
  return firestoreEmailVerifiedEffective(
    authVerified,
    (user.email ?? '').trim(),
  )
}

/** Keep `users/{uid}.email_verified` aligned with Auth (+ allowlisted QA emails). */
export async function syncEmailVerifiedFromAuthToFirestore(
  uid: string,
  firebaseUser?: User | null,
): Promise<void> {
  const user = firebaseUser ?? auth.currentUser
  if (!user || user.uid !== uid) return

  try {
    await user.reload()
  } catch {
    return
  }
  try {
    await user.getIdToken(true)
  } catch {
    /* continue */
  }

  let authEmailVerified = user.emailVerified
  try {
    const tr = await user.getIdTokenResult(true)
    if (
      emailVerifiedFromIdTokenClaims(tr.claims as Record<string, unknown>)
    ) {
      authEmailVerified = true
    }
  } catch {
    /* keep user.emailVerified */
  }

  const emailForPolicy = (user.email ?? '').trim()
  const firestoreVerified = firestoreEmailVerifiedEffective(
    authEmailVerified,
    emailForPolicy,
  )

  if (
    !authEmailVerified &&
    !firestoreVerified &&
    !isEmailVerificationRequiredForSignIn(emailForPolicy)
  ) {
    console.warn(
      '[auth] Firebase Auth still reports unverified for',
      emailForPolicy,
      '— Firestore email_verified stays false until Auth marks the address verified.',
    )
  }

  try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    if (snap.data()?.email_verified === firestoreVerified) return
    await updateDoc(ref, {
      email_verified: firestoreVerified,
      updated_at: new Date(),
    })
  } catch (e) {
    console.warn(
      '[auth] email_verified Firestore sync skipped:',
      e instanceof Error ? e.message : e,
    )
  }
}

export { isEmailVerificationRequiredForSignIn }
