import { firestoreService } from "../../firebase-firestore"

export const getMoodLogs = async (
  userId: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    console.log('🔥 Fetching mood logs for user:', userId)

    const startDateObj = startDate ? new Date(startDate) : undefined
    const endDateObj = endDate ? new Date(endDate) : undefined

    const moodLogs = await firestoreService.getMoodLogs(
      userId,
      startDateObj,
      endDateObj
    )

    console.log('✅ Mood logs fetched: ', moodLogs.length, 'entries')
    return moodLogs
  } catch (error) {
    console.error('❌ Get mood logs error:', error)
    throw error
  }
}