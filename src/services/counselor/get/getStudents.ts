import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import { StudentInfo } from '../types'

export const getStudents = async (collegeCode: string): Promise<StudentInfo[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('college_code', '==', collegeCode),
      where('email_verified', '==', true),
    )

    const querySnapshot = await getDocs(q)

    const students: StudentInfo[] = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        full_name: data.full_name || data.displayName || 'Unknown Student',
        email: data.email || 'No Email',
        role: data.role || 'student',
        program: data.program || undefined,
        yearLevel: data.yearLevel || undefined,
        department: data.department || data.dept || undefined,
        avatar_url: typeof data.avatar_url === 'string' && data.avatar_url.trim()
          ? data.avatar_url.trim()
          : undefined,
      }
    })

    console.log(`✅ Retrieved ${students.length} students from Firebase`)
    return students
  } catch (error) {
    console.error('❌ Error fetching students from Firebase: ', error)
    return []
  }
}