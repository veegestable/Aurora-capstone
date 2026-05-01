import { createSessionRequest } from "./post/createSessionRequest"
import { studentConfirmFinalSlot } from "./post/studentConfirmFinalSlot"
import { getSessionsForStudent } from "./get/getSessionsForStudent"
import { getSessionsForCounselor } from "./get/getSessionsForCounselor"
import { updateSessionStatus } from "./put/updateSessionStatus"

export const sessionsService = {
  createSessionRequest,
  studentConfirmFinalSlot,
  getSessionsForStudent,
  getSessionsForCounselor,
  updateSessionStatus
}