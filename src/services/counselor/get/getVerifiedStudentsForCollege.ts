import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import type { CollegeCode } from '../../../constants/colleges'

/** Verified students in one college (mobile `getVerifiedStudentsForCollege`). */
export async function getVerifiedStudentsForCollege(
  collegeCode: CollegeCode,
): Promise<Record<string, unknown>[]> {
  const byId: Record<string, Record<string, unknown>> = {}
  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      byId[d.id] = { id: d.id, ...(d.data() ?? {}) }
    })
  }

  const qCode = query(
    collection(db, 'users'),
    where('role', '==', 'student'),
    where('email_verified', '==', true),
    where('college_code', '==', collegeCode),
  )
  collect(await getDocs(qCode))

  const qDept = query(
    collection(db, 'users'),
    where('role', '==', 'student'),
    where('email_verified', '==', true),
    where('department', '==', collegeCode),
  )
  collect(await getDocs(qDept))

  return Object.values(byId)
}
