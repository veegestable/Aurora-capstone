import {
  COLLEGE_CODES,
  type CollegeCode,
  getCollegeName,
  resolveCollegeCodeFromUserData,
} from "../../constants/colleges";
import {
  buildProgramRosterByCollege,
  type ProgramRosterByCollege,
} from "./programRosterCounts";

export type CollegeRosterBarPoint = {
  key: CollegeCode;
  label: string;
  count: number;
};

export type CollegeRosterCountsSnapshot = {
  studentsByCollege: CollegeRosterBarPoint[];
  specialPopulationByCollege: CollegeRosterBarPoint[];
  programByCollege: ProgramRosterByCollege;
  unassignedStudents: number;
  unassignedSpecialPopulation: number;
  totalStudents: number;
  totalSpecialPopulation: number;
};

/** Any counselor granted journal access (guidance session consent). */
export function isStudentInSpecialPopulation(
  counselorJournalAccess: Record<string, boolean> | undefined,
): boolean {
  if (!counselorJournalAccess) return false;
  return Object.values(counselorJournalAccess).some((v) => v === true);
}

export function buildCollegeRosterCounts(
  students: Record<string, unknown>[],
  specialPopulationStudentIds: ReadonlySet<string>,
): CollegeRosterCountsSnapshot {
  const totalByCode = new Map<CollegeCode, number>();
  const specialByCode = new Map<CollegeCode, number>();
  for (const code of COLLEGE_CODES) {
    totalByCode.set(code, 0);
    specialByCode.set(code, 0);
  }

  let unassignedStudents = 0;
  let unassignedSpecialPopulation = 0;

  for (const row of students) {
    const id = String(row.id ?? "").trim();
    const code = resolveCollegeCodeFromUserData(row);
    const inSp = id.length > 0 && specialPopulationStudentIds.has(id);

    if (code) {
      totalByCode.set(code, (totalByCode.get(code) ?? 0) + 1);
      if (inSp) {
        specialByCode.set(code, (specialByCode.get(code) ?? 0) + 1);
      }
    } else {
      unassignedStudents += 1;
      if (inSp) unassignedSpecialPopulation += 1;
    }
  }

  const toPoints = (counts: Map<CollegeCode, number>): CollegeRosterBarPoint[] =>
    COLLEGE_CODES.map((code) => ({
      key: code,
      label: code,
      count: counts.get(code) ?? 0,
    }));

  return {
    studentsByCollege: toPoints(totalByCode),
    specialPopulationByCollege: toPoints(specialByCode),
    programByCollege: buildProgramRosterByCollege(
      students,
      specialPopulationStudentIds,
    ),
    unassignedStudents,
    unassignedSpecialPopulation,
    totalStudents: students.length,
    totalSpecialPopulation: specialPopulationStudentIds.size,
  };
}

export function collegeRosterCaption(code: CollegeCode): string {
  return getCollegeName(code);
}
