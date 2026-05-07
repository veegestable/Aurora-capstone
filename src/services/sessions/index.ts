import { createSessionRequest } from "./post/createSessionRequest"
import { createCounselorSessionInvite } from "./post/createCounselorSessionInvite"
import { studentConfirmFinalSlot } from "./post/studentConfirmFinalSlot"
import { createSessionNote } from "./post/createSessionNote"
import { getSessionsForStudent } from "./get/getSessionsForStudent"
import { getSessionsForCounselor } from "./get/getSessionsForCounselor"
import { getSessionNotes } from "./get/getSessionNotes"
import { updateSessionStatus } from "./put/updateSessionStatus"
import { updateSessionNote } from "./put/updateSessionNote"
import { deleteSessionNote } from "./delete/deleteSessionNote"

export type { SessionNote } from './types'

export const sessionsService = {
  createSessionRequest,
  createCounselorSessionInvite,
  studentConfirmFinalSlot,
  createSessionNote,
  getSessionsForStudent,
  getSessionsForCounselor,
  getSessionNotes,
  updateSessionStatus,
  updateSessionNote,
  deleteSessionNote
}