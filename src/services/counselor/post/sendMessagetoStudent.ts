import { messagesService } from "../../messages"

export const sendMessagetoStudent = async (
  counselorId: string,
  studentId: string,
  message: string
) => {
  try {
    await messagesService.sendTextMessage(counselorId, studentId, message)
    
    console.log(`✅ Message sent from ${counselorId} to student ${studentId}`)
    return { success: true }
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}