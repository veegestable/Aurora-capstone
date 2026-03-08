import { getAccessibleStudents } from "./get/getAccessibleStudents"
import { getStudents } from "./get/getStudents"
import { getStudentMoodLogs } from  "./get/getStudentMoodLogs"
import { getStudentSchedules } from "./get/getStudentSchedules"
import { grantAccess } from "./post/grantAccess"
import { sendMessagetoStudent } from "./post/sendMessagetoStudent"
import { revokeAccess } from "./delete/revokeAccess"

export * from './types'

export const counselorService = {
  getAccessibleStudents,
  getStudents,
  getStudentMoodLogs,
  getStudentSchedules,
  grantAccess,
  sendMessagetoStudent,
  revokeAccess
}