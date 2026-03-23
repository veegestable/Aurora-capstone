import { firestoreService } from '../../firebase-firestore'
import { MoodLogResponse } from '../types'

export const getStudentMoodLogs = async (
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<MoodLogResponse[]> => {
  try {
    const parsedStart = startDate ? new Date(startDate) : undefined
    const parsedEnd = endDate ? new Date(endDate) : undefined

    const logs = await firestoreService.getMoodLogs(studentId, parsedStart, parsedEnd)

    return logs.map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      emotions: log.emotions,
      colors: [],
      confidence: [],
      note: log.notes,
      log_date: log.log_date.toISOString()
    }))
  } catch (error) {
    console.error('Error fetching student mood logs: ', error)
    return []
  }
}