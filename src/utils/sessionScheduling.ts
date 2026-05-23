/** Agreed session slot helpers — aligned with mobile `sessionScheduling.ts`. */

import {
  isSameDay,
  isSessionScheduledTimeReached,
  parsePreferredTimeToDate,
  parseSlotToDate,
  normalizeScheduleWhitespace,
} from './dateHelpers'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export type SessionHistoryBadge =
  | 'pending'
  | 'today'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'expired'
  | 'reschedule'

export type OverdueSchedulingState = 'none' | 'needs_rescheduling' | 'expired'

function normalizeSlotObject(raw: unknown): { date: string; time: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const date = o.date != null ? String(o.date).trim() : ''
  if (!date) return null
  const time = o.time != null ? String(o.time).trim() : ''
  return { date, time }
}

export function getConfirmedFinalSlot(session: {
  finalSlot?: unknown
  confirmedSlot?: unknown
}): { date: string; time: string } | null {
  return (
    normalizeSlotObject(session.finalSlot) ?? normalizeSlotObject(session.confirmedSlot)
  )
}

export function getAgreedSessionSlot(session: {
  finalSlot?: { date: string; time: string } | null
  confirmedSlot?: { date: string; time: string } | null
  proposedSlots?: Array<{ date: string; time: string }>
}): { date: string; time: string } | null {
  const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0]
  if (!slot?.date) return null
  return { date: slot.date, time: slot.time ?? '' }
}

function coerceFirestoreTimeToDate(v: unknown): Date | null {
  if (v == null) return null
  if (v instanceof Date) {
    return !Number.isNaN(v.getTime()) ? v : null
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v)
    return !Number.isNaN(d.getTime()) ? d : null
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v)
    return !Number.isNaN(d.getTime()) ? d : null
  }
  if (typeof v === 'object') {
    const o = v as { toDate?: () => Date; toMillis?: () => number; seconds?: number }
    if (typeof o.toDate === 'function') {
      const d = o.toDate()
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
    }
    if (typeof o.toMillis === 'function') {
      const ms = o.toMillis()
      if (Number.isFinite(ms)) {
        const d = new Date(ms)
        return !Number.isNaN(d.getTime()) ? d : null
      }
    }
    if (typeof o.seconds === 'number') {
      const d = new Date(o.seconds * 1000)
      return !Number.isNaN(d.getTime()) ? d : null
    }
  }
  return null
}

export function getScheduledStartMs(scheduledStartAt: unknown): number | null {
  const d = coerceFirestoreTimeToDate(scheduledStartAt)
  return d ? d.getTime() : null
}

export function getSessionScheduledDate(session: {
  scheduledStartAt?: unknown
  finalSlot?: { date: string; time: string } | null
  confirmedSlot?: { date: string; time: string } | null
  proposedSlots?: Array<{ date: string; time: string }>
  preferredTimeFromStudent?: string
}): Date | null {
  const authoritative = coerceFirestoreTimeToDate(session.scheduledStartAt)
  if (authoritative) return authoritative
  const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0]
  if (slot?.date) {
    const d = parseSlotToDate({ date: slot.date, time: slot.time ?? '' })
    if (d && !isNaN(d.getTime())) return d
    const mergedAt = parsePreferredTimeToDate(
      normalizeScheduleWhitespace(`${slot.date} at ${slot.time ?? ''}`),
    )
    if (mergedAt && !isNaN(mergedAt.getTime())) return mergedAt
  }
  const pref = session.preferredTimeFromStudent?.trim()
  if (pref) return parsePreferredTimeToDate(pref)
  return null
}

export function getOverdueSchedulingState(
  scheduled: Date | null,
  now: Date = new Date(),
): OverdueSchedulingState {
  if (!scheduled || isNaN(scheduled.getTime())) return 'none'
  const msPast = now.getTime() - scheduled.getTime()
  if (msPast <= 0) return 'none'
  if (msPast <= ONE_DAY_MS) return 'needs_rescheduling'
  return 'expired'
}

export function computeSessionHistoryBadge(
  session: {
    status: string
    scheduledStartAt?: unknown
    finalSlot?: { date: string; time: string } | null
    confirmedSlot?: { date: string; time: string } | null
    proposedSlots?: Array<{ date: string; time: string }>
    preferredTimeFromStudent?: string
  },
  now: Date = new Date(),
): SessionHistoryBadge {
  const st = session.status
  if (st === 'completed') return 'completed'
  if (st === 'missed') return 'missed'
  if (st === 'cancelled') return 'cancelled'
  if (st === 'rescheduled') return 'pending'
  if (st === 'expired') return 'expired'
  if (st === 'needs_rescheduling') return 'reschedule'

  const scheduled = getSessionScheduledDate(session)
  if (!scheduled || isNaN(scheduled.getTime())) return 'pending'

  const overdue = getOverdueSchedulingState(scheduled, now)
  if (overdue === 'expired') return 'expired'
  if (overdue === 'needs_rescheduling') return 'reschedule'

  if (isSameDay(scheduled, now)) return 'today'
  return 'pending'
}

/** Effective status for attendance eligibility (includes overdue derivation). */
export function getEffectiveSessionStatus(session: {
  status: string
  scheduledStartAt?: unknown
  finalSlot?: { date: string; time: string } | null
  confirmedSlot?: { date: string; time: string } | null
  proposedSlots?: Array<{ date: string; time: string }>
  preferredTimeFromStudent?: string
}): string {
  if (
    ['completed', 'missed', 'cancelled', 'rescheduled', 'needs_rescheduling', 'expired'].includes(
      session.status,
    )
  ) {
    return session.status
  }
  const scheduled = getSessionScheduledDate(session)
  const overdue = getOverdueSchedulingState(scheduled)
  if (overdue === 'expired') return 'expired'
  if (overdue === 'needs_rescheduling') return 'needs_rescheduling'
  return session.status
}

const ATTENDANCE_ELIGIBLE_STATUSES = new Set([
  'confirmed',
  'pending',
  'requested',
  'needs_rescheduling',
  'expired',
])

/** Counselor may mark attendance only after the scheduled instant has passed. */
export function canCounselorMarkSessionAttendance(session: {
  status: string
  finalSlot?: { date: string; time: string } | null
  confirmedSlot?: { date: string; time: string } | null
  proposedSlots?: Array<{ date: string; time: string }>
  preferredTimeFromStudent?: string
  scheduledStartAt?: unknown
}): boolean {
  const rawSlot = getAgreedSessionSlot(session) ?? session.proposedSlots?.[0]
  if (!rawSlot) return false
  if (
    !isSessionScheduledTimeReached(rawSlot, {
      scheduledStartMs: getScheduledStartMs(session.scheduledStartAt),
    })
  ) {
    return false
  }
  return ATTENDANCE_ELIGIBLE_STATUSES.has(getEffectiveSessionStatus(session))
}
