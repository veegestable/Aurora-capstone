import {
  COLLEGE_CODES,
  type CollegeCode,
  resolveCollegeCodeFromUserData,
} from "../../constants/colleges";
import {
  getProgramsForCollege,
  isProgramInCollege,
} from "../../constants/college-programs-iit";
import { matchLegacyDepartmentToProgramValue } from "../../constants/ccs-student-programs";

export const NO_PROGRAM_BUCKET = "__no_program__";
export const UNLISTED_PROGRAM_BUCKET = "__unlisted__";

export type ProgramRosterBarPoint = {
  key: string;
  label: string;
  count: number;
};

export type ProgramRosterForCollege = {
  studentsByProgram: ProgramRosterBarPoint[];
  specialPopulationByProgram: ProgramRosterBarPoint[];
  totalInCollege: number;
  totalSpecialInCollege: number;
};

export type ProgramRosterByCollege = Record<CollegeCode, ProgramRosterForCollege>;

export function shortProgramChartLabel(programKey: string): string {
  if (programKey === NO_PROGRAM_BUCKET) return "None";
  if (programKey === UNLISTED_PROGRAM_BUCKET) return "Other";
  const paren = programKey.match(/\(([^)]+)\)\s*$/)?.[1];
  if (paren) {
    return paren.length <= 14 ? paren : `${paren.slice(0, 12)}…`;
  }
  return programKey.length > 14 ? `${programKey.slice(0, 12)}…` : programKey;
}

function readProgramFields(row: Record<string, unknown>): {
  program: string;
  department: string;
} {
  const program =
    typeof row.program === "string" ? row.program.trim() : "";
  const department =
    typeof row.department === "string" ? row.department.trim() : "";
  return { program, department };
}

/** Map a student row to a catalog program label or bucket key for one college. */
export function resolveStudentProgramBucket(
  row: Record<string, unknown>,
  collegeCode: CollegeCode,
): string {
  const catalog = getProgramsForCollege(collegeCode);
  const { program, department } = readProgramFields(row);

  const candidates = [program, department].filter(Boolean);
  for (const c of candidates) {
    if (isProgramInCollege(collegeCode, c)) return c;
  }

  const legacy = matchLegacyDepartmentToProgramValue(department || program);
  if (legacy && isProgramInCollege(collegeCode, legacy)) return legacy;

  const hay = (program || department).toLowerCase();
  if (hay) {
    for (const label of catalog) {
      const low = label.toLowerCase();
      if (low === hay) return label;
      const paren = label.match(/\(([^)]+)\)\s*$/)?.[1];
      if (paren && hay.includes(paren.toLowerCase())) return label;
      if (low.includes(hay) || hay.includes(low.slice(0, 24))) return label;
    }
    return UNLISTED_PROGRAM_BUCKET;
  }

  return NO_PROGRAM_BUCKET;
}

export function buildProgramRosterForCollege(
  students: Record<string, unknown>[],
  specialPopulationStudentIds: ReadonlySet<string>,
  collegeCode: CollegeCode,
): ProgramRosterForCollege {
  const catalog = [...getProgramsForCollege(collegeCode)];
  const totalByProgram = new Map<string, number>();
  const specialByProgram = new Map<string, number>();

  for (const key of catalog) {
    totalByProgram.set(key, 0);
    specialByProgram.set(key, 0);
  }
  totalByProgram.set(NO_PROGRAM_BUCKET, 0);
  totalByProgram.set(UNLISTED_PROGRAM_BUCKET, 0);
  specialByProgram.set(NO_PROGRAM_BUCKET, 0);
  specialByProgram.set(UNLISTED_PROGRAM_BUCKET, 0);

  let totalInCollege = 0;
  let totalSpecialInCollege = 0;

  for (const row of students) {
    const studentCollege = resolveCollegeCodeFromUserData(row);
    if (studentCollege !== collegeCode) continue;

    const id = String(row.id ?? "").trim();
    const inSp = id.length > 0 && specialPopulationStudentIds.has(id);
    const bucket = resolveStudentProgramBucket(row, collegeCode);

    totalInCollege += 1;
    if (inSp) totalSpecialInCollege += 1;

    totalByProgram.set(bucket, (totalByProgram.get(bucket) ?? 0) + 1);
    if (inSp) {
      specialByProgram.set(bucket, (specialByProgram.get(bucket) ?? 0) + 1);
    }
  }

  const orderedKeys = [
    ...catalog,
    ...(totalByProgram.get(UNLISTED_PROGRAM_BUCKET)
      ? [UNLISTED_PROGRAM_BUCKET]
      : []),
    ...(totalByProgram.get(NO_PROGRAM_BUCKET) ? [NO_PROGRAM_BUCKET] : []),
  ];

  const toPoints = (counts: Map<string, number>): ProgramRosterBarPoint[] =>
    orderedKeys.map((key) => ({
      key,
      label: shortProgramChartLabel(key),
      count: counts.get(key) ?? 0,
    }));

  return {
    studentsByProgram: toPoints(totalByProgram),
    specialPopulationByProgram: toPoints(specialByProgram),
    totalInCollege,
    totalSpecialInCollege,
  };
}

export function buildProgramRosterByCollege(
  students: Record<string, unknown>[],
  specialPopulationStudentIds: ReadonlySet<string>,
): ProgramRosterByCollege {
  const out = {} as ProgramRosterByCollege;
  for (const code of COLLEGE_CODES) {
    out[code] = buildProgramRosterForCollege(
      students,
      specialPopulationStudentIds,
      code,
    );
  }
  return out;
}
