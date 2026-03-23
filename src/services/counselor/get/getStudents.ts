import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import { StudentInfo } from '../types'

export const getStudents = async (): Promise<StudentInfo[]> => {
  try {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'student')
    )
    
    const querySnapshot = await getDocs(q)
    
    const students: StudentInfo[] = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        full_name: data.full_name || data.displayName || 'Unknown Student',
        email: data.email || 'No Email',
        role: data.role || 'student',

        program: data.program || undefined,
        yearLevel: data.yearLevel || undefined,
      } as StudentInfo
    })

    console.log(`✅ Retrieved ${students.length} students from Firebase`)
    return students

  } catch (error) {
    console.error('❌ Error fetching students from Firebase: ', error)
    return []
  }
}