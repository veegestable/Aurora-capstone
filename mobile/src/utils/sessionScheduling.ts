import {
  isSameDay,
  isSessionScheduledTimeReached,
  normalizeScheduleWhitespace,
  parsePreferredTimeToDate,
  parseSlotToDate,
} from "./dateHelpers";

export const COUNSELOR_ATTENDANCE_MARK_DENIED =
  "Attendance can only be recorded after the student has agreed to a session time and that scheduled time has passed.";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function coerceFirestoreTimeToDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return !Number.isNaN(v.getTime()) ? v : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) ? d : null;
  }
  if (
    typeof v === "object" &&
    typeof (v as { toDate?: () => Date }).toDate === "function"
  ) {
    const d = (v as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

export function getScheduledStartMs(scheduledStartAt: unknown): number | null {
  const d = coerceFirestoreTimeToDate(scheduledStartAt);
  return d ? d.getTime() : null;
}

/**
 * Counselor session history badge key — stored on `sessions.sessionHistoryBadge` and recomputed on load.
 * Display labels/copy: use `getSessionHistoryBadgePresentation()` in `sessionPresentation.ts`.
 * - pending: upcoming, on a future calendar day
 * - today: upcoming, scheduled later today
 * - reschedule: overdue ≤24h (still time to act)
 * - expired: overdue >24h
 */
export type SessionHistoryBadge =
  | "pending"
  | "today"
  | "completed"
  | "missed"
  | "cancelled"
  | "expired"
  | "reschedule";

/** Sessions with `expired` status are deleted from Firestore after this many ms from `expiredAt`. */
export const EXPIRED_SESSION_RETENTION_MS = 7 * ONE_DAY_MS;

export type OverdueSchedulingState = "none" | "needs_rescheduling" | "expired";

function normalizeSlotObject(raw: unknown): { date: string; time: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const date = o.date != null ? String(o.date).trim() : "";
  if (!date) return null;
  const time = o.time != null ? String(o.time).trim() : "";
  return { date, time };
}

/**
 * Locked agreed time only (after someone confirms `finalSlot` / `confirmedSlot`) — no proposed-slot fallback.
 */
export function getConfirmedFinalSlot(session: {
  finalSlot?: unknown;
  confirmedSlot?: unknown;
}): { date: string; time: string } | null {
  return (
    normalizeSlotObject(session.finalSlot) ??
    normalizeSlotObject(session.confirmedSlot)
  );
}

/**
 * Agreed date/time (counselor + student). When set, this is the only basis for badges and overdue.
 */
export function getAgreedSessionSlot(session: {
  finalSlot?: { date: string; time: string } | null;
  confirmedSlot?: { date: string; time: string } | null;
  proposedSlots?: Array<{ date: string; time: string }>;
}): { date: string; time: string } | null {
  const slot =
    session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0];
  if (!slot?.date) return null;
  return { date: slot.date, time: slot.time ?? "" };
}

export function getSessionScheduledDate(session: {
  scheduledStartAt?: unknown;
  finalSlot?: { date: string; time: string } | null;
  confirmedSlot?: { date: string; time: string } | null;
  proposedSlots?: Array<{ date: string; time: string }>;
  preferredTimeFromStudent?: string;
}): Date | null {
  const authoritative = coerceFirestoreTimeToDate(session.scheduledStartAt);
  if (authoritative) return authoritative;
  const slot =
    session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0];
  if (slot?.date) {
    const d = parseSlotToDate({
      date: slot.date,
      time: slot.time ?? "",
    });
    if (d && !isNaN(d.getTime())) return d;
    const mergedAt = parsePreferredTimeToDate(
      normalizeScheduleWhitespace(`${slot.date} at ${slot.time ?? ""}`),
    );
    if (mergedAt && !isNaN(mergedAt.getTime())) return mergedAt;
    const mergedComma = parsePreferredTimeToDate(
      normalizeScheduleWhitespace(`${slot.date}, ${slot.time ?? ""}`),
    );
    if (mergedComma && !isNaN(mergedComma.getTime())) return mergedComma;
  }
  if (session.preferredTimeFromStudent) {
    const fromPreferred = parsePreferredTimeToDate(
      session.preferredTimeFromStudent,
    );
    if (fromPreferred) return fromPreferred;
    const synthetic = parseSlotToDate({
      date: session.preferredTimeFromStudent,
      time: "",
    });
    if (synthetic) return synthetic;
  }
  return null;
}

/**
 * After the scheduled time has passed:
 * - Within the first 24 hours → needs_rescheduling
 * - More than 24 hours overdue → expired
 */
export function getOverdueSchedulingState(
  scheduled: Date | null,
  now: Date = new Date(),
): OverdueSchedulingState {
  if (!scheduled || isNaN(scheduled.getTime())) return "none";
  const msPast = now.getTime() - scheduled.getTime();
  if (msPast <= 0) return "none";
  if (msPast <= ONE_DAY_MS) return "needs_rescheduling";
  return "expired";
}

/**
 * Derives the badge shown in Session History from `status` + scheduled time.
 */
export function computeSessionHistoryBadge(
  session: {
    status: string;
    scheduledStartAt?: unknown;
    finalSlot?: { date: string; time: string } | null;
    confirmedSlot?: { date: string; time: string } | null;
    proposedSlots?: Array<{ date: string; time: string }>;
    preferredTimeFromStudent?: string;
  },
  now: Date = new Date(),
): SessionHistoryBadge {
  const st = session.status;
  if (st === "completed") return "completed";
  if (st === "missed") return "missed";
  if (st === "cancelled") return "cancelled";
  if (st === "rescheduled") return "pending";

  if (st === "expired") return "expired";
  if (st === "needs_rescheduling") return "reschedule";

  const scheduled = getSessionScheduledDate(session);
  if (!scheduled || isNaN(scheduled.getTime())) return "pending";

  const overdue = getOverdueSchedulingState(scheduled, now);
  if (overdue === "expired") return "expired";
  if (overdue === "needs_rescheduling") return "reschedule";

  if (isSameDay(scheduled, now)) return "today";
  return "pending";
}

/** Counselor Session History chip filters (labels ≠ raw Firestore `status` for upcoming/reschedule). */
export type SessionHistoryListFilter =
  | "all"
  | "upcoming"
  | "needs_rescheduling"
  | "completed"
  | "expired"
  | "missed";

export const SESSION_HISTORY_LIST_FILTERS: ReadonlyArray<{
  label: string;
  value: SessionHistoryListFilter;
}> = [
  { label: "All Sessions", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Reschedule", value: "needs_rescheduling" },
  { label: "Completed", value: "completed" },
  { label: "Expired", value: "expired" },
  { label: "Missed", value: "missed" },
];

export function sessionMatchesSessionHistoryListFilter(
  session: Parameters<typeof computeSessionHistoryBadge>[0],
  filter: SessionHistoryListFilter,
  now?: Date,
): boolean {
  if (filter === "all") return true;

  const badge = computeSessionHistoryBadge(session, now);

  if (filter === "upcoming") {
    return badge === "pending" || badge === "today";
  }

  if (filter === "needs_rescheduling") {
    return session.status === "needs_rescheduling" || badge === "reschedule";
  }

  if (filter === "expired") {
    return session.status === "expired" || badge === "expired";
  }

  return session.status === filter;
}

/** Effective status for attendance eligibility (includes overdue derivation). */
export function getEffectiveSessionStatus(session: {
  status: string;
  scheduledStartAt?: unknown;
  finalSlot?: { date: string; time: string } | null;
  confirmedSlot?: { date: string; time: string } | null;
  proposedSlots?: Array<{ date: string; time: string }>;
  preferredTimeFromStudent?: string;
}): string {
  if (
    [
      "completed",
      "missed",
      "cancelled",
      "rescheduled",
      "needs_rescheduling",
      "expired",
    ].includes(session.status)
  ) {
    return session.status;
  }
  const scheduled = getSessionScheduledDate(session);
  const overdue = getOverdueSchedulingState(scheduled);
  if (overdue === "expired") return "expired";
  if (overdue === "needs_rescheduling") return "needs_rescheduling";
  return session.status;
}

const ATTENDANCE_ELIGIBLE_STATUSES = new Set([
  "confirmed",
  "needs_rescheduling",
  "expired",
]);

/** Session History list — agreed slot or terminal attendance outcome. */
export function sessionQualifiesForCounselorHistoryList(session: {
  status: string;
  finalSlot?: unknown;
  confirmedSlot?: unknown;
}): boolean {
  const st = String(session.status ?? "").toLowerCase();
  if (st === "completed" || st === "missed" || st === "rescheduled") {
    return true;
  }
  return getConfirmedFinalSlot(session) != null;
}

/** Counselor may mark attendance only after a locked slot exists and scheduled time has passed. */
export function canCounselorMarkSessionAttendance(session: {
  status: string;
  finalSlot?: { date: string; time: string } | null;
  confirmedSlot?: { date: string; time: string } | null;
  proposedSlots?: Array<{ date: string; time: string }>;
  preferredTimeFromStudent?: string;
  scheduledStartAt?: unknown;
}): boolean {
  const st = String(session.status ?? "").toLowerCase();
  if (st === "completed" || st === "missed" || st === "cancelled") {
    return false;
  }

  const lockedSlot = getConfirmedFinalSlot(session);
  if (!lockedSlot) return false;

  if (
    !isSessionScheduledTimeReached(lockedSlot, {
      scheduledStartMs: getScheduledStartMs(session.scheduledStartAt),
    })
  ) {
    return false;
  }

  return ATTENDANCE_ELIGIBLE_STATUSES.has(
    getEffectiveSessionStatus(session),
  );
}

export function assertCounselorCanMarkSessionAttendance(
  session: Parameters<typeof canCounselorMarkSessionAttendance>[0],
): void {
  if (!canCounselorMarkSessionAttendance(session)) {
    throw new Error(COUNSELOR_ATTENDANCE_MARK_DENIED);
  }
}

export function resolveSessionHistoryListFilter(
  raw: SessionHistoryListFilter | string | undefined,
): SessionHistoryListFilter {
  if (!raw) return "all";
  if (raw === "upcoming" || raw === "pending" || raw === "confirmed") {
    return "upcoming";
  }
  if (raw === "reschedule") return "needs_rescheduling";
  if (raw === "closed") return "all";
  if (
    raw === "all" ||
    raw === "needs_rescheduling" ||
    raw === "completed" ||
    raw === "expired" ||
    raw === "missed"
  ) {
    return raw;
  }
  return "all";
}
