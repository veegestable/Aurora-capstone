import { getConversationsForStudent } from "./getConversationsForStudent"
import { getMessagesForStudent } from "./getMessagesForStudent"
import { sendTextMessage } from "./sendTextMessage"

export const messagesService = {
  getConversationsForStudent,
  getMessagesForStudent,
  sendTextMessage
}