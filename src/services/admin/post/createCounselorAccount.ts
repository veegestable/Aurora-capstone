import { FirebaseError } from 'firebase/app'
import { createCounselorAccountTrusted } from '../../trusted-backend.service'
import type { CollegeCode } from '../../constants/colleges'

export type CreateCounselorAccountInput = {
  email: string
  password: string
  fullName: string
  college_code: CollegeCode
  contact_number?: string
}

function toUserFacingCreateCounselorError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    const message = err.message?.trim()
    if (message && !message.startsWith('Firebase')) {
      return new Error(message)
    }
    if (err.code === 'functions/permission-denied') {
      return new Error('Only admins can create counselor accounts.')
    }
    if (err.code === 'functions/unauthenticated') {
      return new Error('Sign in as an admin to create counselor accounts.')
    }
    if (err.code === 'functions/already-exists') {
      return new Error('An account with this email already exists.')
    }
  }
  if (err instanceof Error && err.message) return err
  return new Error('Could not create counselor account. Please try again.')
}

export async function createCounselorAccount(
  input: CreateCounselorAccountInput,
): Promise<{ uid: string }> {
  try {
    return await createCounselorAccountTrusted(input)
  } catch (err) {
    throw toUserFacingCreateCounselorError(err)
  }
}
