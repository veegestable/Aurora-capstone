/**
 * Counselor list / card signals — self-report framing, no "risk" or clinical priority wording.
 */

export type CounselorSignalPill =
    | 'no_checkins'
    | 'higher_self_report'
    | 'moderate_self_report'
    | 'typical_self_report';

export const COUNSELOR_SIGNAL_LABEL: Record<CounselorSignalPill, string> = {
    no_checkins: 'No check-ins',
    /** Counselor triage — supportive wording; avoids labeling students as "high stress". */
    higher_self_report: 'Follow-up suggested',
    moderate_self_report: 'Moderate self-report',
    typical_self_report: 'Typical self-report',
};

/** Sort: stronger self-reports first; empty window last. */
export const COUNSELOR_SIGNAL_SORT: Record<CounselorSignalPill, number> = {
    higher_self_report: 0,
    moderate_self_report: 1,
    typical_self_report: 2,
    no_checkins: 10,
};

type LogLike = { stress_level?: number; energy_level?: number };

/**
 * Empty window → no_checkins. Do not use default stress/energy when there are no logs
 * (that incorrectly showed "medium").
 */
export function counselorSignalFromLogs(logs: LogLike[]): CounselorSignalPill {
    if (!logs?.length) return 'no_checkins';
    const latest = logs[0];
    const stress = typeof latest.stress_level === 'number' ? latest.stress_level : 5;
    const energy = typeof latest.energy_level === 'number' ? latest.energy_level : 5;
    if (stress >= 7 || energy <= 2) return 'higher_self_report';
    if (stress >= 5 || energy <= 4) return 'moderate_self_report';
    return 'typical_self_report';
}
