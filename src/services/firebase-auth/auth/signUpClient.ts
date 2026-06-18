import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'
import { SignUpData, UserProfile } from '../types'
import { type CollegeCode, isCollegeCode } from '../../../constants/colleges'
import { isProgramInCollege } from '../../../constants/college-programs-iit'
import { getSignupEmailRejectionMessage } from '../../../utils/signupEmailPolicy'
import { toUserFacingEmailAuthError } from '../../../utils/firebase-auth-errors'

/** Direct Firebase client registration (fallback when signUpTrusted is not deployed). */
export async function signUpWithClientSdk(data: SignUpData): Promise<UserProfile> {
  if (data.role !== 'student') {
    throw new Error(
      'Counselor accounts are created by an admin. Contact your institution if you need access.',
    )
  }

  const policyError = getSignupEmailRejectionMessage(data.email)
  if (policyError) throw new Error(policyError)

  if (!data.college_code || !isCollegeCode(data.college_code)) {
    throw new Error('Select a valid college before singing up.')
  }

  const prog = data.program?.trim() ?? ''
  if (!prog || !data.college_code || !isProgramInCollege(data.college_code, prog)) {
    throw new Error(
      'Select a degree program that matches your college before singing up.',
    )
  }
  const studentProgramTrimmed = prog

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  )

  const user = userCredential.user

  await updateProfile(user, {
    displayName: data.fullName,
  })

  const userProfile: UserProfile = {
    uid: user.uid,
    email: data.email.toLowerCase(),
    full_name: data.fullName,
    role: data.role,
    email_verified: user.emailVerified,
    college_code: data.college_code as CollegeCode,
    program: studentProgramTrimmed,
    created_at: new Date(),
    updated_at: new Date(),
  }

  await setDoc(doc(db, 'users', user.uid), userProfile)
  await sendEmailVerification(user)
  await firebaseSignOut(auth)

  return userProfile
}

export async function signUpWithClientSdkSafe(
  data: SignUpData,
): Promise<UserProfile> {
  try {
    return await signUpWithClientSdk(data)
  } catch (error: unknown) {
    throw toUserFacingEmailAuthError(error)
  }
}
