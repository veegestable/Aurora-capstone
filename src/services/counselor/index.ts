import { getStudents } from "./get/getStudents"
import { getStudentsForCounselor } from "./get/getStudentsForCounselor"

export * from './types'

export const counselorService = {
  getStudents,
  getStudentsForCounselor,
}