import {
    isSameDay,
    normalizeScheduleWhitespace,
    parsePreferredTimeToDate,
    parseSlotToDate,
} from './dateHelpers';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Counselor session history pill — stored on `sessions.sessionHistoryBadge` and recomputed on load.
 * - pending: upcoming, on a future calendar day
 * - today: upcoming, scheduled later today
 * - reschedule: overdue ≤24h (still time to act)
 * - expired: overdue >24h
 */
export type SessionHistoryBadge =
    | 'pending'
    | 'today'
    | 'completed'
    | 'missed'
    | 'cancelled'
    | 'expired'
    | 'reschedule';

/** Sessions with `expired` status are deleted from Firestore after this many ms from `expiredAt`. */
export const EXPIRED_SESSION_RETENTION_MS = 7 * ONE_DAY_MS;

export type OverdueSchedulingState = 'none' | 'needs_rescheduling' | 'expired';

/**
 * Agreed date/time (counselor + student). When set, this is the only basis for badges and overdue.
 */
export function getAgreedSessionSlot(session: {
    finalSlot?: { date: string; time: string } | null;
    confirmedSlot?: { date: string; time: string } | null;
    proposedSlots?: Array<{ date: string; time: string }>;
}): { date: string; time: string } | null {
    const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0];
    if (!slot?.date) return null;
    return { date: slot.date, time: slot.time ?? '' };
}

export function getSessionScheduledDate(session: {
    finalSlot?: { date: string; time: string } | null;
    confirmedSlot?: { date: string; time: string } | null;
    proposedSlots?: Array<{ date: string; time: string }>;
    preferredTimeFromStudent?: string;
}): Date | null {
    const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0];
    if (slot?.date) {
        const d = parseSlotToDate({
            date: slot.date,
            time: slot.time ?? '',
        });
        if (d && !isNaN(d.getTime())) return d;
        const mergedAt = parsePreferredTimeToDate(
            normalizeScheduleWhitespace(`${slot.date} at ${slot.time ?? ''}`)
        );
        if (mergedAt && !isNaN(mergedAt.getTime())) return mergedAt;
        const mergedComma = parsePreferredTimeToDate(
            normalizeScheduleWhitespace(`${slot.date}, ${slot.time ?? ''}`)
        );
        if (mergedComma && !isNaN(mergedComma.getTime())) return mergedComma;
    }
    if (session.preferredTimeFromStudent) {
        const fromPreferred = parsePreferredTimeToDate(session.preferredTimeFromStudent);
        if (fromPreferred) return fromPreferred;
        const synthetic = parseSlotToDate({ date: session.preferredTimeFromStudent, time: '' });
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
    now: Date = new Date()
): OverdueSchedulingState {
    if (!scheduled || isNaN(scheduled.getTime())) return 'none';
    const msPast = now.getTime() - scheduled.getTime();
    if (msPast <= 0) return 'none';
    if (msPast <= ONE_DAY_MS) return 'needs_rescheduling';
    return 'expired';
}

/**
 * Derives the badge shown in Session History from `status` + scheduled time.
 */
export function computeSessionHistoryBadge(
    session: {
        status: string;
        finalSlot?: { date: string; time: string } | null;
        confirmedSlot?: { date: string; time: string } | null;
        proposedSlots?: Array<{ date: string; time: string }>;
        preferredTimeFromStudent?: string;
    },
    now: Date = new Date()
): SessionHistoryBadge {
    const st = session.status;
    if (st === 'completed') return 'completed';
    if (st === 'missed') return 'missed';
    if (st === 'cancelled') return 'cancelled';
    if (st === 'rescheduled') return 'pending';

    if (st === 'expired') return 'expired';
    if (st === 'needs_rescheduling') return 'reschedule';

    const scheduled = getSessionScheduledDate(session);
    if (!scheduled || isNaN(scheduled.getTime())) return 'pending';

    const overdue = getOverdueSchedulingState(scheduled, now);
    if (overdue === 'expired') return 'expired';
    if (overdue === 'needs_rescheduling') return 'reschedule';

    if (isSameDay(scheduled, now)) return 'today';
    return 'pending';
}
