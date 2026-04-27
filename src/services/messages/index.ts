import { getConversationsForStudent } from "./get/getConversationsForStudent"
import { getConversationsForCounselor } from "./get/getConversationsForCounselor"
import { getMessagesForStudent } from "./get/getMessagesForStudent"
import { sendTextMessage } from "./post/sendTextMessage"
import { createConversation } from "./post/createConversation"

export const messagesService = {
  getConversationsForStudent,
  getConversationsForCounselor,
  getMessagesForStudent,
  sendTextMessage,
  createConversation
}