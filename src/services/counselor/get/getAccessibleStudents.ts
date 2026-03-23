import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import { StudentInfo } from '../types'

export const getAccessibleStudents = async (counselorId: string): Promise<StudentInfo[]> => {
  try {
    const acccessQuery = query(
      collection(db, 'users'), 
      where('counselor_id', '==', counselorId),
      where('status', '==', 'active')
    )
    const accessSnapshot = await getDocs(acccessQuery)

    if (accessSnapshot.empty) return []

    const studentIds = accessSnapshot.docs.map(doc => doc.id)
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    )
    const usersSnapshot = await getDocs(usersQuery)

    const accessibleStudents: StudentInfo[] = []
    usersSnapshot.forEach(doc => {
      if (studentIds.includes(doc.id)) {
        const data = doc.data()

        accessibleStudents.push({
          id: doc.id,
          full_name: data.full_name || data.displayName || 'Unknown Student',
          email: data.email || 'No email',
          role: data.role || 'student',
          program: data.program || undefined,
          yearLevel: data.yearLevel || undefined,
        } as StudentInfo)
      }
    })

    console.log(`✅ Retrieved ${accessibleStudents.length} accessible students`)
    return accessibleStudents
  } catch (error) {
    console.error('❌ Error fetching accessible students: ', error)
    return []
  }
}