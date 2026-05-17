import { getConversationsForStudent } from "./get/getConversationsForStudent"
import { getConversationsForCounselor } from "./get/getConversationsForCounselor"
import { getMessagesForStudent } from "./get/getMessagesForStudent"
import { sendTextMessage } from "./post/sendTextMessage"
import { createConversation } from "./post/createConversation"
import { openCounselorThreadForStudent } from "./post/openCounselorThreadForStudent"
import { markConversationAsRead } from "./put/markConversationAsRead"
import { counselorArchiveConversation } from "./put/counselorArchiveConversation"
import { counselorClearInboxArchive } from "./delete/counselorClearInboxArchive"

export const messagesService = {
  getConversationsForStudent,
  getConversationsForCounselor,
  getMessagesForStudent,
  sendTextMessage,
  createConversation,
  openCounselorThreadForStudent,
  markConversationAsRead,
  counselorArchiveConversation,
  counselorClearInboxArchive,
}