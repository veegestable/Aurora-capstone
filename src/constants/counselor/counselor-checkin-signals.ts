/**
 * Counselor list / card signals — self-report framing, no "risk" or clinical priority wording.
 */

export type CounselorSignalPill =
  | 'sharing_off'
  | 'no_checkins'
  | 'higher_self_report'
  | 'moderate_self_report'
  | 'typical_self_report'

export const COUNSELOR_SIGNAL_LABEL: Record<CounselorSignalPill, string> = {
  sharing_off: 'Sharing off',
  no_checkins: 'No check-ins',
  higher_self_report: 'Higher self-report',
  moderate_self_report: 'Moderate self-report',
  typical_self_report: 'Typical self-report',
}

/** Sort: stronger self-reports first; empty window then sharing-off last. */
export const COUNSELOR_SIGNAL_SORT: Record<CounselorSignalPill, number> = {
  higher_self_report: 0,
  moderate_self_report: 1,
  typical_self_report: 2,
  no_checkins: 10,
  sharing_off: 99,
}

interface LogLike {
  stress_level?: number
  energy_level?: number
}

/**
 * Derive a signal pill from a student's recent mood logs.
 * When sharing is off, never infer mood. When sharing is on but the window is empty,
 * return `no_checkins`.
 */
export function counselorSignalFromLogs(
  sharingEnabled: boolean,
  logs: LogLike[],
): CounselorSignalPill {
  if (!sharingEnabled) return 'sharing_off'
  if (!logs?.length) return 'no_checkins'

  const latest = logs[0]
  const stress = typeof latest.stress_level === 'number' ? latest.stress_level : 5
  const energy = typeof latest.energy_level === 'number' ? latest.energy_level : 5

  if (stress >= 7 || energy <= 2) return 'higher_self_report'
  if (stress >= 5 || energy <= 4) return 'moderate_self_report'
  return 'typical_self_report'
}