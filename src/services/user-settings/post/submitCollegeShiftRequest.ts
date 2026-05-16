import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { type CollegeCode, isCollegeCode, resolveCollegeCodeFromUserData } from '../../../constants/colleges'
import { isProgramInCollege } from '../../../constants/college-programs-iit'

export async function submitCollegeShiftRequest(
  uid: string,
  requestedCollegeCode: CollegeCode,
  requestedProgram: string,
  reason: string
): Promise<void> {
  if (!isCollegeCode(requestedCollegeCode)) throw new Error('Invalid college selection.')

  const trimmed = reason.trim()
  if (trimmed.length < 8) throw new Error('Please indicate the reason for your college change (at least 8 characters).')

  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) throw new Error('Profile not found.')
  const data = (snap.data() ?? {}) as Record<string, unknown>

  const isStudent = data.role === 'student'
  const programTrim = requestedProgram.trim()
  if (isStudent && (!programTrim || !isProgramInCollege(requestedCollegeCode, programTrim))) throw new Error('Choose a degree program from the list for your new college.')

  const current = resolveCollegeCodeFromUserData(data)
  if (!current) throw new Error('Set your college on your profile before requesting a change.')
  if (current === requestedCollegeCode && !isStudent) throw new Error('Select a different college for this request.')
  
  const curProg = typeof data.program === 'string' ? data.program.trim() : ''
  if (curProg && programTrim === curProg) throw new Error('Choose a different degree program than your current one.')

  if (data.college_shift_pending === true) throw new Error('You already have a pending college change request.')

  await updateDoc(doc(db, 'users', uid), {
    college_shift_request: {
      requested_college_code: requestedCollegeCode,
      requested_program: programTrim,
      reason: trimmed,
      requested_at: Timestamp.now(),
    },
    college_shift_pending: true,
    updated_at: new Date()
  })
}