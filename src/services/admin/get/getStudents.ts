import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { AdminStudentUser } from '../types'

export async function getStudents(): Promise<AdminStudentUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'student'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as AdminStudentUser)
}