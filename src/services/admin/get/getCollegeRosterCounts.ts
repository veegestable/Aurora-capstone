import { getStudents } from './getStudents'
import { userSettingsService } from '../../user-settings'
import {
  buildCollegeRosterCounts,
  isStudentInSpecialPopulation,
  type CollegeRosterCountsSnapshot,
} from '../../../utils/admin/collegeRosterCounts'

const SETTINGS_CHUNK = 25

async function loadSpecialPopulationIds(
  studentIds: string[],
): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let i = 0; i < studentIds.length; i += SETTINGS_CHUNK) {
    const chunk = studentIds.slice(i, i + SETTINGS_CHUNK)
    const settingsList = await Promise.all(
      chunk.map((id) => userSettingsService.getUserSettings(id)),
    )
    chunk.forEach((id, idx) => {
      if (isStudentInSpecialPopulation(settingsList[idx]?.counselorJournalAccess)) {
        ids.add(id)
      }
    })
  }
  return ids
}

export async function getCollegeRosterCounts(): Promise<CollegeRosterCountsSnapshot> {
  const students = await getStudents()
  const rows = students.map((s) => ({ ...s }) as Record<string, unknown>)
  const studentIds = rows
    .map((r) => String(r.id ?? '').trim())
    .filter((id) => id.length > 0)
  const specialIds = await loadSpecialPopulationIds(studentIds)
  return buildCollegeRosterCounts(rows, specialIds)
}
