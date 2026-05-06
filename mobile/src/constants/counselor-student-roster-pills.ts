/**
 * Counselor home + directory roster chips — session consent only.
 * Uses the same gate as “special population” journal access (session request or accepted time),
 * not stress/energy triage for the whole roster.
 */

export type CounselorStudentRosterPill = "session_started" | "no_session_yet";

export const COUNSELOR_ROSTER_PILL_LABEL: Record<
  CounselorStudentRosterPill,
  string
> = {
  /** Student started a session flow with you (request or accepted time) — factual, non-clinical. */
  session_started: "Scheduling with you",
  /** No session request / accepted time with you yet — neutral, not a judgment. */
  no_session_yet: "No session yet",
};

/** Students who started scheduling with this counselor appear first. */
export const COUNSELOR_ROSTER_PILL_SORT: Record<
  CounselorStudentRosterPill,
  number
> = {
  session_started: 0,
  no_session_yet: 1,
};
