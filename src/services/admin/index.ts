import { getCounselors } from './get/getCounselors'
import { getStudents } from './get/getStudents'
import { updateCounselorApproval } from './post/updateCounselorApproval'

export * from './types'

export const adminService = {
  getCounselors,
  getStudents,
  updateCounselorApproval
}