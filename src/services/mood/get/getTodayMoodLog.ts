import { getMoodLogs } from './getMoodLogs'

export const getTodayMoodLog = async (userId: string) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const logs = await getMoodLogs(userId, startOfDay.toISOString(), endOfDay.toISOString())

    return logs.length > 0 ? logs[0] : null
  } catch (error) {
    console.error('❌ Get today mood log error:', error)
    throw error
  }
}