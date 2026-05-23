/**
 * Counselor home sessions sheet — categories and section copy (mobile parity).
 */

import { isSessionDocOpenRequestExpired24h, parseSlotToDate } from './dateHelpers'
import { getAgreedSessionSlot, getConfirmedFinalSlot } from './sessionScheduling'

export type CounselorSessionOverviewCategory =
  | 'student_request_pending'
  | 'counselor_invite_pending'
  | 'upcoming'
  | 'awaiting_action'
  | 'completed'
  | 'missed'
  | 'expired'

export interface CounselorSessionOverviewItem {
  id: string
  studentId: string
  studentName: string
  studentAvatar?: string
  status: string
  category: CounselorSessionOverviewCategory
  scheduleSummary?: string
  studentRequestNote: string
  updatedAt: Date
  scheduledSortMs: number
}

export interface CounselorSessionsSheetSection {
  key: CounselorSessionOverviewCategory
  sectionIndex: number
  title: string
  subtitle: string
  items: CounselorSessionOverviewItem[]
}

const CATEGORY_SORT_ORDER: Record<CounselorSessionOverviewCategory, number> = {
  student_request_pending: 0,
  counselor_invite_pending: 1,
  upcoming: 2,
  awaiting_action: 3,
  completed: 4,
  missed: 5,
  expired: 6,
}

export const COUNSELOR_SESSIONS_SHEET_SECTION_ORDER: CounselorSessionOverviewCategory[] = [
  'student_request_pending',
  'counselor_invite_pending',
  'upcoming',
  'awaiting_action',
  'completed',
  'missed',
  'expired',
]

export const COUNSELOR_SESSIONS_SHEET_SECTION_COPY: Record<
  CounselorSessionOverviewCategory,
  { title: string; subtitle: string }
> = {
  student_request_pending: {
    title: 'Student requests',
    subtitle:
      'The student started this session — approve or propose times in Messages. Includes waiting on them to pick a slot you sent.',
  },
  counselor_invite_pending: {
    title: 'Your invites (awaiting student)',
    subtitle:
      'You sent this session — the student still needs to accept or choose a time in Messages.',
  },
  upcoming: {
    title: 'Upcoming counseling',
    subtitle: 'Agreed times that are still in the future.',
  },
  awaiting_action: {
    title: 'Needs follow-up',
    subtitle:
      'Scheduled time has passed or the session needs rescheduling — same items as Session History (Today / Reschedule). Mark attendance there.',
  },
  completed: {
    title: 'Completed',
    subtitle: 'You marked the student as showed up.',
  },
  missed: {
    title: 'Missed',
    subtitle: 'Sessions marked missed or no-show.',
  },
  expired: {
    title: 'Expired requests',
    subtitle:
      'Open session requests that were not accepted within 24 hours (or the preferred time already passed).',
  },
}

function firestoreTsToDate(v: unknown): Date {
  if (
    v != null &&
    typeof v === 'object' &&
    typeof (v as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (v as { toDate: () => Date }).toDate()
  }
  if (v instanceof Date) return v
  return new Date()
}

export function counselorSessionOverviewCategory(
  s: Record<string, unknown>,
): CounselorSessionOverviewCategory | null {
  const st = String(s?.status ?? '').toLowerCase()
  const initiatedBy = String(s?.initiatedBy ?? '').toLowerCase()
  const fromCounselor = initiatedBy === 'counselor'
  const locked = getConfirmedFinalSlot(s)
  const hasLocked = !!(locked?.date && String(locked.date).trim())

  if (st === 'completed') return 'completed'
  if (st === 'missed') return 'missed'
  if (st === 'expired') return 'expired'

  if (st === 'needs_rescheduling') return 'awaiting_action'

  if (!hasLocked) {
    if (
      isSessionDocOpenRequestExpired24h({
        status: st,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
    ) {
      return 'expired'
    }
    if (fromCounselor && st === 'pending') return 'counselor_invite_pending'
    if (!fromCounselor && (st === 'requested' || st === 'pending')) {
      return 'student_request_pending'
    }
  }

  if (
    st === 'confirmed' ||
    st === 'rescheduled' ||
    (st === 'pending' && hasLocked)
  ) {
    if (!hasLocked) return null
    const parsed = parseSlotToDate({
      date: locked!.date,
      time: locked!.time ?? '',
    })
    if (!parsed || isNaN(parsed.getTime())) return null
    if (parsed.getTime() > Date.now()) return 'upcoming'
    return 'awaiting_action'
  }

  return null
}

export function pendingSessionStatusLabel(category: CounselorSessionOverviewCategory): string {
  switch (category) {
    case 'student_request_pending':
      return 'Student request'
    case 'counselor_invite_pending':
      return 'Awaiting student'
    case 'upcoming':
      return 'Upcoming'
    case 'awaiting_action':
      return 'Follow-up'
    case 'completed':
      return 'Completed'
    case 'missed':
      return 'Missed'
    case 'expired':
      return 'Expired request'
    default:
      return ''
  }
}

export function buildCounselorSessionsSheetSections(
  items: CounselorSessionOverviewItem[],
): CounselorSessionsSheetSection[] {
  const buckets = new Map<CounselorSessionOverviewCategory, CounselorSessionOverviewItem[]>()
  for (const c of COUNSELOR_SESSIONS_SHEET_SECTION_ORDER) buckets.set(c, [])
  for (const item of items) buckets.get(item.category)?.push(item)

  const nonempty = COUNSELOR_SESSIONS_SHEET_SECTION_ORDER.filter(
    (c) => (buckets.get(c)?.length ?? 0) > 0,
  )

  return nonempty.map((c, sectionIndex) => ({
    key: c,
    sectionIndex,
    ...COUNSELOR_SESSIONS_SHEET_SECTION_COPY[c],
    items: buckets.get(c)!,
  }))
}

export async function buildCounselorSessionOverviewItems(
  sessions: Array<Record<string, unknown>>,
  resolveStudentName: (studentId: string) => Promise<{ name: string; avatar?: string }>,
): Promise<CounselorSessionOverviewItem[]> {
  const drafts: Array<{
    id: string
    studentId: string
    category: CounselorSessionOverviewCategory
    status: string
    scheduleSummary?: string
    studentRequestNote: string
    updatedAt: Date
    scheduledSortMs: number
  }> = []

  for (const s of sessions) {
    const category = counselorSessionOverviewCategory(s)
    if (!category) continue

    const id = String(s.id ?? '')
    const sid = String(s.studentId ?? '')
    if (!id || !sid) continue

    const locked = getConfirmedFinalSlot(s)
    const agreedForDisplay =
      locked ??
      getAgreedSessionSlot(
        s as {
          finalSlot?: { date: string; time: string } | null
          confirmedSlot?: { date: string; time: string } | null
          proposedSlots?: Array<{ date: string; time: string }>
        },
      )
    const prefRaw =
      typeof s.preferredTimeFromStudent === 'string' ? s.preferredTimeFromStudent.trim() : ''
    let scheduleSummary: string | undefined
    if (agreedForDisplay?.date) {
      scheduleSummary = `Scheduled: ${agreedForDisplay.date}${agreedForDisplay.time ? ` · ${agreedForDisplay.time}` : ''}`
    } else if (prefRaw) {
      scheduleSummary = `Preferred: ${prefRaw}`
    }

    let scheduledSortMs = firestoreTsToDate(s.updatedAt).getTime()
    if (
      (category === 'upcoming' || category === 'awaiting_action') &&
      agreedForDisplay?.date
    ) {
      const parsed = parseSlotToDate({
        date: agreedForDisplay.date,
        time: agreedForDisplay.time ?? '',
      })
      if (parsed && !isNaN(parsed.getTime())) scheduledSortMs = parsed.getTime()
    }

    drafts.push({
      id,
      studentId: sid,
      category,
      status: String(s.status ?? ''),
      scheduleSummary,
      studentRequestNote:
        typeof s.studentRequestNote === 'string' ? s.studentRequestNote : '',
      updatedAt: firestoreTsToDate(s.updatedAt),
      scheduledSortMs,
    })
  }

  if (drafts.length === 0) return []

  const nameCache = new Map<string, { name: string; avatar?: string }>()
  const uniqueStudentIds = [...new Set(drafts.map((d) => d.studentId))]
  await Promise.all(
    uniqueStudentIds.map(async (sid) => {
      nameCache.set(sid, await resolveStudentName(sid))
    }),
  )

  const rows: CounselorSessionOverviewItem[] = drafts.map((d) => {
    const meta = nameCache.get(d.studentId)
    return {
      id: d.id,
      studentId: d.studentId,
      studentName: meta?.name ?? 'Student',
      studentAvatar: meta?.avatar,
      status: d.status,
      category: d.category,
      scheduleSummary: d.scheduleSummary,
      studentRequestNote: d.studentRequestNote,
      updatedAt: d.updatedAt,
      scheduledSortMs: d.scheduledSortMs,
    }
  })

  return rows.sort((a, b) => {
    const tier = CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category]
    if (tier !== 0) return tier
    if (
      (a.category === 'upcoming' && b.category === 'upcoming') ||
      (a.category === 'awaiting_action' && b.category === 'awaiting_action')
    ) {
      return a.scheduledSortMs - b.scheduledSortMs
    }
    if (
      (a.category === 'student_request_pending' && b.category === 'student_request_pending') ||
      (a.category === 'counselor_invite_pending' && b.category === 'counselor_invite_pending')
    ) {
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })
}
