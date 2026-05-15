/**
 * Official degree programs by college (MSU-IIT).
 * Source: `COLLEGES and programs IN IIT.txt` — normalized to single-line labels.
 * Must stay in sync with `validStudentProgramForCollege` in `firestore.rules`.
 */

import type { CollegeCode } from "./colleges";
import { isCollegeCode } from "./colleges";

export const IIT_COLLEGE_PROGRAMS: Record<CollegeCode, readonly string[]> = {
  COE: [
    "Bachelor of Science in Chemical Engineering (BSChe)",
    "Bachelor of Science in Environmental Engineering",
    "Bachelor of Science in Civil Engineering (BSCE)",
    "Bachelor of Science in Computer Engineering (BSCpE)",
    "Bachelor of Science in Electrical Engineering (BSEE)",
    "Bachelor of Science in Electronics and Communication Engineering (BSECE)",
    "Bachelor of Science in Industrial Automation and Mechatronics",
    "Bachelor of Science in Ceramics Engineering",
    "Bachelor of Science in Metallurgical Engineering",
    "Bachelor of Science in Mining Engineering",
    "Bachelor of Science in Mechanical Engineering (BSME)",
    "Bachelor of Engineering Technology Major in Chemical Engineering and Technology",
    "Bachelor of Engineering Technology Major in Civil Engineering Technology (BET-CET)",
    "Bachelor of Engineering Technology Major in ELECTRICAL ENGINEERING TECHNOLOGY (BET-EET)",
    "Bachelor of Engineering Technology Major in ELECTRONICS ENGINEERING TECHNOLOGY (BET-EST)",
    "Bachelor of Engineering Technology Major in METALLURGICAL and MATERIALS ENGINEERING TECHNOLOGY (BET-MMT)",
    "Bachelor of Engineering Technology Major in MECHANICAL ENGINEERING TECHNOLOGY (BET-MET)",
  ],
  CCS: [
    "Bachelor of Science in Information Technology (BSIT)",
    "Bachelor of Science in Computer Science (BSCS)",
    "Bachelor of Science in Information Systems (BSIS)",
    "Bachelor of Science in Computer Applications (BSCA)",
  ],
  CSM: [
    "Bachelor of Science in Biology (General)",
    "Bachelor of Science in Biology (Botany)",
    "Bachelor of Science in Biology (Marine Biology)",
    "Bachelor of Science in Biology (Zoology)",
    "Bachelor of Science in Chemistry",
    "Bachelor of Science in Mathematics",
    "Bachelor of Science in Statistics",
    "Bachelor of Science in Physics",
  ],
  CED: [
    "Bachelor of Elementary Education Science and Mathematics",
    "Bachelor of Secondary Education Biology",
    "Bachelor of Secondary Education Chemistry",
    "Bachelor of Secondary Education Physics",
    "Bachelor of Secondary Education Mathematics",
    "Bachelor of Physical Education",
    "Bachelor of Technology and Livelihood Education major in Home Economics",
    "Bachelor of Technical-Vocational Teacher Education major in Drafting Technology",
    "Bachelor of Technology and Livelihood Education Major in Industrial Arts (BTLEd-Industrial Arts)",
    "Bachelor of Elementary Education - Language Education",
    "Bachelor of Secondary Education Filipino",
  ],
  CASS: [
    "Bachelor of Arts in English Language Studies",
    "Bachelor of Arts in Filipino",
    "Bachelor of Arts in History",
    "Bachelor of Arts in Panitikan",
    "Bachelor of Arts in Political Science",
    "Bachelor of Arts in Psychology",
    "Bachelor of Arts in Sociology",
    "Bachelor of Science in Philosophy",
    "Bachelor of Science in Psychology",
  ],
  CEBA: [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Economics",
    "Bachelor of Science in Business Administration major in Business Economics",
    "Bachelor of Science in Business Administration major in Marketing Management",
    "Bachelor of Science Major in Entrepreneurship",
    "Bachelor of Science in Hospitality Management",
  ],
  CHS: ["Bachelor of Science in Nursing"],
} as const;

export function getProgramsForCollege(
  collegeCode: string | undefined,
): readonly string[] {
  const c = collegeCode?.trim();
  if (!c || !isCollegeCode(c)) return [];
  return IIT_COLLEGE_PROGRAMS[c];
}

/** Exact label match against the IIT catalog for the given college. */
export function isProgramInCollege(
  collegeCode: string | undefined,
  program: string | undefined,
): boolean {
  const p = program?.trim();
  if (!p) return false;
  const list = getProgramsForCollege(collegeCode);
  return list.includes(p);
}

/**
 * If `program` exactly matches one catalog line, return that college code.
 * Used to backfill `college_code` on older or Google-created profiles that have `program` only.
 */
export function inferCollegeCodeFromProgramLabel(
  program: string | undefined,
): CollegeCode | "" {
  const p = program?.trim();
  if (!p) return "";
  for (const code of Object.keys(IIT_COLLEGE_PROGRAMS) as CollegeCode[]) {
    if (isProgramInCollege(code, p)) return code;
  }
  return "";
}
