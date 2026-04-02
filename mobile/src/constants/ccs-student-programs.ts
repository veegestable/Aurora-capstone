/**
 * CCS degree programs (MSU-IIT) — student profile + counselor filters/display.
 * Firestore: `department` = college unit (CCS), `program` = degree line below.
 */

export const CCS_COLLEGE_DEPARTMENT = 'CCS';

export type ProgramFilterCode = 'BSCS' | 'BSIT' | 'BSIS' | 'BSCA';

export const DEGREE_PROGRAM_OPTIONS: ReadonlyArray<{
    value: string;
    short: ProgramFilterCode;
}> = [
    { value: 'BS CS (Computer Science)', short: 'BSCS' },
    { value: 'BS IT (Information Technology)', short: 'BSIT' },
    { value: 'BS IS (Information Systems)', short: 'BSIS' },
    { value: 'BS CA (Computer Application)', short: 'BSCA' },
];

export const PROGRAM_FILTER_LABELS: Record<ProgramFilterCode, string> = {
    BSCS: 'BS CS',
    BSIT: 'BS IT',
    BSIS: 'BS IS',
    BSCA: 'BS CA',
};

export function formatYearLevelForDisplay(yearLevel?: string): string {
    if (!yearLevel?.trim()) return '';
    const t = yearLevel.trim();
    if (/\byear\b/i.test(t)) return t;
    return `${t} Year`;
}

/** Map legacy free-text `department` (when it was used as “program”) to a dropdown value. */
export function matchLegacyDepartmentToProgramValue(department?: string): string {
    if (!department?.trim()) return '';
    const d = department.trim();
    if (d === CCS_COLLEGE_DEPARTMENT) return '';
    if (DEGREE_PROGRAM_OPTIONS.some((o) => o.value === d)) return d;
    const low = d.toLowerCase();
    if (low.includes('computer application') || /\bbs[\s._-]*ca\b/i.test(d)) {
        return DEGREE_PROGRAM_OPTIONS.find((o) => o.short === 'BSCA')!.value;
    }
    if (low.includes('information system') && !low.includes('technology')) {
        return DEGREE_PROGRAM_OPTIONS.find((o) => o.short === 'BSIS')!.value;
    }
    if (low.includes('information technology') || low.includes('bsit')) {
        return DEGREE_PROGRAM_OPTIONS.find((o) => o.short === 'BSIT')!.value;
    }
    if (low.includes('computer science') || low.includes('bscs')) {
        return DEGREE_PROGRAM_OPTIONS.find((o) => o.short === 'BSCS')!.value;
    }
    return '';
}

/**
 * Counselor-facing line: CCS · degree · year.
 * Supports legacy docs where `department` held the degree string.
 */
export function formatCounselorStudentSubtitle(input: {
    department?: string;
    program?: string;
    year_level?: string;
}): string {
    const degree =
        input.program?.trim() ||
        (input.department?.trim() &&
        input.department.trim() !== CCS_COLLEGE_DEPARTMENT
            ? input.department.trim()
            : '');
    const college =
        input.department === CCS_COLLEGE_DEPARTMENT || !!degree
            ? CCS_COLLEGE_DEPARTMENT
            : input.department?.trim() || '';
    const year = formatYearLevelForDisplay(input.year_level);
    return [college, degree, year].filter(Boolean).join(' · ');
}

/** Normalize user fields to a filter chip id (session history / directory). */
export function normalizeStudentToProgramFilter(
    department?: string,
    program?: string
): ProgramFilterCode | '' {
    const direct = DEGREE_PROGRAM_OPTIONS.find((o) => o.value === program)?.short;
    if (direct) return direct;
    const hay = `${program || ''} ${department || ''}`.toLowerCase();
    if (hay.includes('computer application') || hay.includes('bs ca') || hay.includes('bsca')) return 'BSCA';
    if (hay.includes('information system') && !hay.includes('technology')) return 'BSIS';
    if (hay.includes('information technology') || hay.includes('bs it') || hay.includes('bsit')) return 'BSIT';
    if (hay.includes('computer science') || hay.includes('bs cs') || hay.includes('bscs')) return 'BSCS';
    return '';
}
