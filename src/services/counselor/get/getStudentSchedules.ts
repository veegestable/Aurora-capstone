import { ScheduleResponse } from '../types'

export const getStudentSchedules = async (
  studentId: string, 
  startDate?: string, 
  endDate?: string
): Promise<ScheduleResponse[]> => {
  try {
    let url = `/api/counselor/students/${studentId}/schedules`

    const params = new URLSearchParams()

    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) throw new Error('Failed to fetch schedules')
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching student schedules: ', error)
    return []
  }
}