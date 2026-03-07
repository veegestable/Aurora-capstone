import { StudentInfo } from '../types'

export const getStudents = async (): Promise<StudentInfo[]> => {
  try {
    const response = await fetch('/api/counselor/students', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) throw new Error('Failed to fetch students')

    return await response.json()
  } catch (error) {
    console.error('Error fetching students: ', error)
    return []
  }
}