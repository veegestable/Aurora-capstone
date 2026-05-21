import { SignUpData, UserProfile } from '../types'
import { type CollegeCode, isCollegeCode } from '../../../constants/colleges'
import { isProgramInCollege } from '../../../constants/college-programs-iit'
import { getSignupEmailRejectionMessage } from '../../../utils/signupEmailPolicy'
import { signUpTrusted } from '../../trusted-backend.service'
import { signUpWithClientSdkSafe } from './signUpClient'
import {
  shouldFallbackToClientSignUp,
  toUserFacingSignUpTrustedError,
} from './signUpTrustedErrors'

function buildUserProfileFromSignUp(uid: string, data: SignUpData): UserProfile {
  const studentProgramTrimmed =
    data.role === 'student' ? data.program?.trim() : undefined

  return {
    uid,
    email: data.email.toLowerCase(),
    full_name: data.fullName,
    role: data.role,
    email_verified: false,
    ...(data.role === 'counselor' ? { approval_status: 'pending' as const } : {}),
    ...(data.role === 'student' || data.role === 'counselor'
      ? { college_code: data.college_code as CollegeCode }
      : {}),
    ...(data.role === 'student' && studentProgramTrimmed
      ? { program: studentProgramTrimmed }
      : {}),
    created_at: new Date(),
    updated_at: new Date(),
  }
}

function validateSignUpData(data: SignUpData): void {
  const policyError = getSignupEmailRejectionMessage(data.email)
  if (policyError) throw new Error(policyError)

  if (data.role === 'counselor' || data.role === 'student') {
    if (!data.college_code || !isCollegeCode(data.college_code)) {
      throw new Error('Select a valid college before singing up.')
    }
  }

  if (data.role === 'student') {
    const prog = data.program?.trim() ?? ''
    if (!prog || !data.college_code || !isProgramInCollege(data.college_code, prog)) {
      throw new Error(
        'Select a degree program that matches your college before singing up.',
      )
    }
  }
}

export const signUp = async (data: SignUpData): Promise<UserProfile> => {
  try {
    console.log('🔥 Creating Firebase user:', data.email)
    validateSignUpData(data)

    try {
      const { uid } = await signUpTrusted({
        email: data.email.trim(),
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        college_code: data.college_code as CollegeCode,
        ...(data.role === 'student' && data.program?.trim()
          ? { program: data.program.trim() }
          : {}),
      })
      console.log('✅ User created via signUpTrusted:', uid)
      return buildUserProfileFromSignUp(uid, data)
    } catch (trustedErr: unknown) {
      if (shouldFallbackToClientSignUp(trustedErr)) {
        console.warn(
          '[signUp] signUpTrusted unavailable, using client SDK fallback',
          trustedErr,
        )
        return await signUpWithClientSdkSafe(data)
      }
      throw toUserFacingSignUpTrustedError(trustedErr)
    }
  } catch (error: unknown) {
    console.error('❌ Signup error:', error)
    throw error instanceof Error ? error : toUserFacingSignUpTrustedError(error)
  }
}
