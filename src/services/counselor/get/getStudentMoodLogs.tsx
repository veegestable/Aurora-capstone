import { MoodLogResponse } from '../types'

export const getStudentMoodLogs = async (
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<MoodLogResponse[]> => {
  try {
    let url = `/api/counselor/students/${studentId}/moods`

    const params = new URLSearchParams()

    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`
  
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) throw new Error('Failed to fetch mood logs')
    return await response.json()
  } catch (error) {
    console.error('Error fetching student mood logs: ', error)
    return []
  }
}