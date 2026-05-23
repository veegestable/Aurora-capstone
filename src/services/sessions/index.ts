import { createSessionRequest } from "./post/createSessionRequest"
import { sendSessionRequestFromConversation } from "./post/sendSessionRequestFromConversation"
import { createCounselorSessionInvite } from "./post/createCounselorSessionInvite"
import { studentConfirmFinalSlot } from "./post/studentConfirmFinalSlot"
import { createSessionNote } from "./post/createSessionNote"
import { getSessionsForStudent } from "./get/getSessionsForStudent"
import { getSessionsForCounselor } from "./get/getSessionsForCounselor"
import { getCounselorNamesForSessions } from "./get/getCounselorNamesForSessions"
import { getSessionOutcomeCountsForCounselorStudent } from "./get/getSessionOutcomeCountsForCounselorStudent"
import { getSessionNotes } from "./get/getSessionNotes"
import { acceptStudentSessionRequest } from "./post/acceptStudentSessionRequest"
import { proposeSlots } from "./post/proposeSlots"
import { markSessionAttendance } from "./put/markSessionAttendance"
import { updateSessionStatus } from "./put/updateSessionStatus"
import { updateSessionNote } from "./put/updateSessionNote"
import { deleteSessionNote } from "./delete/deleteSessionNote"

export type { SessionNote } from "./types"

export const sessionsService = {
  createSessionRequest,
  sendSessionRequestFromConversation,
  createCounselorSessionInvite,
  acceptStudentSessionRequest,
  proposeSlots,
  studentConfirmFinalSlot,
  createSessionNote,
  getSessionsForStudent,
  getSessionsForCounselor,
  getCounselorNamesForSessions,
  getSessionOutcomeCountsForCounselorStudent,
  getSessionNotes,
  updateSessionStatus,
  markSessionAttendance,
  updateSessionNote,
  deleteSessionNote,
}