import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'
import { UserProfile } from '../types'
import {
  readAuthEmailVerifiedEffective,
  syncEmailVerifiedFromAuthToFirestore,
} from '../emailVerificationSync'

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const user = auth.currentUser
  if (!user) return null

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (!userDoc.exists()) return null

    const profile = userDoc.data() as UserProfile
    await syncEmailVerifiedFromAuthToFirestore(user.uid, user)
    const emailVerifiedEffective = await readAuthEmailVerifiedEffective(user)

    return {
      ...profile,
      uid: user.uid,
      email: profile.email ?? user.email ?? '',
      email_verified: emailVerifiedEffective,
    }
  } catch (error: unknown) {
    console.error(
      '❌ Get current user error:',
      error instanceof Error ? error.message : error,
    )
    return null
  }
}
