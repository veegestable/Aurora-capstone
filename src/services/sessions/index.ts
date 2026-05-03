import { createSessionRequest } from "./post/createSessionRequest"
import { createCounselorSessionInvite } from "./post/createCounselorSessionInvite"
import { studentConfirmFinalSlot } from "./post/studentConfirmFinalSlot"
import { getSessionsForStudent } from "./get/getSessionsForStudent"
import { getSessionsForCounselor } from "./get/getSessionsForCounselor"
import { updateSessionStatus } from "./put/updateSessionStatus"

export const sessionsService = {
  createSessionRequest,
  createCounselorSessionInvite,
  studentConfirmFinalSlot,
  getSessionsForStudent,
  getSessionsForCounselor,
  updateSessionStatus
}