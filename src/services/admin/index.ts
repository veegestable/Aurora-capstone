import { getCounselors } from './get/getCounselors'
import { getStudents } from './get/getStudents'
import { getSchoolAnalytics } from './get/getSchoolAnalytics'
import { getThresholdSnapshot } from './get/getThresholdSnapshot'
import { getCollegeRosterCounts } from './get/getCollegeRosterCounts'
import { updateCounselorApproval } from './post/updateCounselorApproval'

export * from './types'
export * from './get/getSchoolAnalytics'
export * from './get/getThresholdSnapshot'

export const adminService = {
  getCounselors,
  getStudents,
  getSchoolAnalytics,
  getThresholdSnapshot,
  getCollegeRosterCounts,
  updateCounselorApproval
}