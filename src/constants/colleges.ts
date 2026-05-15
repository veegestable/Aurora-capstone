/**
 * Canonical college codes for MSU-IIT units. Stored on user profiles as `college_code`.
 * Legacy Firestore docs may still have `department` holding the same code string.
 */

export const COLLEGE_CODES = [
  "COE",
  "CSM",
  "CCS",
  "CED",
  "CASS",
  "CEBA",
  "CHS",
] as const;

export type CollegeCode = (typeof COLLEGE_CODES)[number];

export const COLLEGE_CODE_SET: ReadonlySet<string> = new Set(COLLEGE_CODES);

export const COLLEGES: ReadonlyArray<{
  code: CollegeCode;
  name: string;
}> = [
  { code: "COE", name: "College of Engineering" },
  { code: "CSM", name: "College of Science and Mathematics" },
  { code: "CCS", name: "College of Computer Studies" },
  { code: "CED", name: "College of Education" },
  { code: "CASS", name: "College of Arts and Social Sciences" },
  {
    code: "CEBA",
    name: "College of Economics, Business & Accountancy",
  },
  { code: "CHS", name: "College of Health Services" },
];

const NAME_TO_CODE: Record<string, CollegeCode> = (() => {
  const m: Record<string, CollegeCode> = {};
  for (const { code, name } of COLLEGES) {
    m[name.trim().toLowerCase()] = code;
  }
  return m;
})();

export function isCollegeCode(v: unknown): v is CollegeCode {
  return typeof v === "string" && COLLEGE_CODE_SET.has(v);
}

export function getCollegeName(code: CollegeCode | string | undefined): string {
  if (!code || typeof code !== "string") return "";
  const row = COLLEGES.find((c) => c.code === code);
  return row?.name ?? code;
}

/** Normalize any user-shaped record to a canonical college code, or "". */
export function resolveCollegeCodeFromUserData(
  data: Record<string, unknown> | null | undefined,
): CollegeCode | "" {
  if (!data) return "";
  const cc = data.college_code;
  if (isCollegeCode(cc)) return cc;
  const dep = data.department;
  if (typeof dep === "string") {
    const t = dep.trim();
    if (isCollegeCode(t)) return t;
    const byName = NAME_TO_CODE[t.toLowerCase()];
    if (byName) return byName;
  }
  return "";
}