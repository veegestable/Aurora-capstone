import { StudentInfo } from '../types'

export const getAccessibleStudents = async (counselorId: string): Promise<StudentInfo[]> => {
  try {
    const response = await fetch(`/api/counselor/accessible-students?counselorId=${counselorId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`  
      }
    })

    if (!response.ok) throw new Error('Failed to fetch accessible students')

    return await response.json()
  } catch (error) {
    console.error('Error fetching accessible students: ', error)
    return []
  }
}