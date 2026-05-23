import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { AdminStudentUser } from '../types'
import { readContactNumber, readStudentNumber } from '../../../utils/admin/studentRosterFields'

export async function getStudents(): Promise<AdminStudentUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'student'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = (d.data() ?? {}) as Record<string, unknown>
    const student_number = readStudentNumber(data)
    const contact_number = readContactNumber(data)
    return {
      id: d.id,
      ...data,
      full_name: String(data.full_name ?? ''),
      email: String(data.email ?? ''),
      student_number: student_number || undefined,
      contact_number: contact_number || undefined,
    } as AdminStudentUser
  })
}
