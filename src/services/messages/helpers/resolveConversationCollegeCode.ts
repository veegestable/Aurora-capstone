import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { resolveCollegeCodeFromUserData, type CollegeCode } from '../../../constants/colleges'

/**
 * Resolves a college code for a conversation between a counselor and a student.
 * Prefers the student's college, falls back to the counselor's.
 */
export async function resolveConversationCollegeCode(
  counselorId: string,
  studentId: string,
): Promise<CollegeCode | ''> {
  try {
    const [cSnap, sSnap] = await Promise.all([
      getDoc(doc(db, 'users', counselorId)),
      getDoc(doc(db, 'users', studentId)),
    ])
    const studentCollege = resolveCollegeCodeFromUserData(
      (sSnap.data() ?? {}) as Record<string, unknown>,
    )
    if (studentCollege) return studentCollege
    const counselorCollege = resolveCollegeCodeFromUserData(
      (cSnap.data() ?? {}) as Record<string, unknown>,
    )
    return counselorCollege ?? ''
  } catch {
    return ''
  }
}