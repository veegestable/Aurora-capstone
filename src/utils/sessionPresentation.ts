/**
 * Role-aware session status copy — aligned with mobile `sessionPresentation.ts`.
 */

import type { SessionHistoryBadge } from './sessionScheduling'

export type SessionDisplayRole = 'student' | 'counselor'

export type SessionPresentationVariant =
  | 'amber'
  | 'green'
  | 'blue'
  | 'orange'
  | 'red'
  | 'muted'

export type SessionPresentationContext = {
  status: string
  role: SessionDisplayRole
  counselorOfferedSlots?: boolean
  isExpired?: boolean
}

export type SessionPresentation = {
  pillLabel: string
  subtitle: string
  variant: SessionPresentationVariant
}

const CLOSED = new Set(['completed', 'missed', 'cancelled', 'expired', 'declined'])

export function sessionPresentationColors(variant: SessionPresentationVariant): {
  bg: string
  text: string
} {
  switch (variant) {
    case 'green':
      return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' }
    case 'blue':
      return { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' }
    case 'orange':
      return { bg: 'rgba(249,115,22,0.2)', text: '#fb923c' }
    case 'red':
      return { bg: 'rgba(239,68,68,0.2)', text: '#f87171' }
    case 'muted':
      return { bg: 'rgba(255,255,255,0.08)', text: '#94a3b8' }
    case 'amber':
    default:
      return { bg: 'rgba(254,189,3,0.2)', text: '#fbbf24' }
  }
}

export function getSessionPresentation(ctx: SessionPresentationContext): SessionPresentation {
  const st = (ctx.status ?? '').trim().toLowerCase()
  const student = ctx.role === 'student'

  if (ctx.isExpired || st === 'expired') {
    return {
      pillLabel: 'Expired request',
      subtitle: student
        ? 'This request is no longer active. You can send a new one if you still need support.'
        : 'This request can no longer be accepted.',
      variant: 'muted',
    }
  }

  if (st === 'cancelled') {
    return { pillLabel: 'Cancelled', subtitle: 'This session was cancelled.', variant: 'red' }
  }
  if (st === 'completed') {
    return {
      pillLabel: 'Completed',
      subtitle: student ? 'This counseling session is complete.' : 'Marked as completed.',
      variant: 'blue',
    }
  }
  if (st === 'missed') {
    return {
      pillLabel: 'Did not attend',
      subtitle: student
        ? 'Marked as not attended. You can request a new time in Messages.'
        : 'Student did not attend this session.',
      variant: 'orange',
    }
  }
  if (st === 'confirmed') {
    return {
      pillLabel: 'Scheduled',
      subtitle: student
        ? 'Your session time is confirmed. See Messages for details.'
        : 'Session time is locked in.',
      variant: 'green',
    }
  }
  if (st === 'needs_rescheduling') {
    return {
      pillLabel: student ? 'Reschedule needed' : 'Needs rescheduling',
      subtitle: student
        ? 'The scheduled time passed — pick a new time in Messages.'
        : 'Follow up with the student to set a new time.',
      variant: 'orange',
    }
  }
  if (st === 'pending') {
    if (student && ctx.counselorOfferedSlots) {
      return {
        pillLabel: 'Pick a time',
        subtitle: 'Your counselor sent times — choose one in Messages.',
        variant: 'blue',
      }
    }
    return {
      pillLabel: student ? 'Counselor invite' : 'Awaiting student',
      subtitle: student
        ? 'Your counselor invited you to schedule — open Messages to respond.'
        : 'Waiting for the student to confirm a time.',
      variant: student ? 'blue' : 'amber',
    }
  }
  if (st === 'requested') {
    return {
      pillLabel: student ? 'Waiting for counselor' : 'New request',
      subtitle: student
        ? 'Your counselor will review your preferred time (usually within 24 hours).'
        : 'Review the request — accept the time or propose another.',
      variant: 'amber',
    }
  }

  return {
    pillLabel: student ? 'Session' : 'In progress',
    subtitle: CLOSED.has(st) ? '' : 'Open Messages for details.',
    variant: 'amber',
  }
}

export function formatCounselorSessionPillLabel(label: string): string {
  return label.toUpperCase()
}

export function getSessionHistoryBadgePresentation(badge: SessionHistoryBadge): {
  counselorPillUpper: string
  hint: string
  variant: SessionPresentationVariant
} {
  switch (badge) {
    case 'pending':
      return {
        counselorPillUpper: 'UPCOMING',
        hint: 'Confirmed time is on a later date.',
        variant: 'blue',
      }
    case 'today':
      return {
        counselorPillUpper: 'TODAY',
        hint: 'Session is scheduled for today.',
        variant: 'green',
      }
    case 'completed':
      return {
        counselorPillUpper: 'COMPLETED',
        hint: 'This session was marked completed.',
        variant: 'green',
      }
    case 'missed':
      return {
        counselorPillUpper: 'DID NOT ATTEND',
        hint: 'Student did not attend this session.',
        variant: 'orange',
      }
    case 'cancelled':
      return {
        counselorPillUpper: 'CANCELLED',
        hint: 'This session was cancelled.',
        variant: 'muted',
      }
    case 'expired':
      return {
        counselorPillUpper: 'EXPIRED',
        hint: 'More than 24h past scheduled time — follow up was needed.',
        variant: 'muted',
      }
    case 'reschedule':
      return {
        counselorPillUpper: 'RESCHEDULE NEEDED',
        hint: 'Within 24h after scheduled time — set a new time or mark attendance.',
        variant: 'orange',
      }
  }
}
