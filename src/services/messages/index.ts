import { getConversationsForStudent } from "./getConversationsForStudent"
import { getConversationsForCounselor } from "./getConversationsForCounselor"
import { getMessagesForStudent } from "./getMessagesForStudent"
import { sendTextMessage } from "./sendTextMessage"

export const messagesService = {
  getConversationsForStudent,
  getConversationsForCounselor,
  getMessagesForStudent,
  sendTextMessage
}