import { createSessionRequest } from "./post/createSessionRequest"
import { getSessionsForStudent } from "./get/getSessionsForStudent"
import { getSessionsForCounselor } from "./get/getSessionsForCounselor"
import { updateSessionStatus } from "./put/updateSessionStatus"

export const sessionsService = {
  createSessionRequest,
  getSessionsForStudent,
  getSessionsForCounselor,
  updateSessionStatus
}