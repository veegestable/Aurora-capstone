import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../../config/firebase'
import { SignUpData, UserProfile } from '../types'
import { type CollegeCode, isCollegeCode } from '../../../constants/colleges'
import { isProgramInCollege } from '../../../constants/college-programs-iit'

export const signUp = async (data: SignUpData): Promise<UserProfile> => {
  try {
    console.log('🔥 Creating Firebase user:', data.email)

    // Validate college_code for student & counselor
    if (data.role === 'counselor' || data.role === 'student') {
      if (!data.college_code || !isCollegeCode(data.college_code)) throw new Error('Select a valid college before singing up.')
    }
    
    // Validate program for students
    let studentProgramTrimmed: string | undefined
    if (data.role === 'student') {
      const prog = data.program?.trim() ?? ''
      if (!prog || !data.college_code || !isProgramInCollege(data.college_code, prog)) {
        throw new Error('Select a degree program that matches your college before singing up.')
      }
      studentProgramTrimmed = prog
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      data.email, 
      data.password
    )
    
    const user = userCredential.user
    
    // Update display name
    await updateProfile(user, {
      displayName: data.fullName
    })
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: data.email,
      full_name: data.fullName,
      role: data.role,
      ...(data.role === 'counselor'
        ? { approval_status: 'pending' as const }
        : {}),
      ...(data.role === 'student' || data.role === 'counselor'
        ? { college_code: data.college_code as CollegeCode }
        : {}),
      ...(data.role === 'student' && studentProgramTrimmed
        ? { program: studentProgramTrimmed }
        : {}),
      created_at: new Date(),
      updated_at: new Date()
    }
    
    await setDoc(doc(db, 'users', user.uid), userProfile)
    
    // Sign out user immediately to require manual login
    await auth.signOut()
    
    console.log('✅ User created successfully - please log in')
    return userProfile;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Signup error:', msg)
    throw new Error(msg)
  }
}