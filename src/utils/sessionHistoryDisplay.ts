import { parsePreferredTimeToDate, parseSlotToDate } from './dateHelpers'
import { getAgreedSessionSlot } from './sessionScheduling'
import type { Session } from '../types/session.types'

export function formatSlotForDisplay(
  slot: { date: string; time: string } | null | undefined,
): { date: string; time: string } | null {
  if (!slot?.date) return null
  const d = parseSlotToDate({ date: slot.date, time: slot.time ?? '' })
  if (!d) return { date: String(slot.date), time: slot.time ?? '—' }
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  }
}

export function formatSessionTimelineLine(d: Date): string {
  if (!d || isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`
}

export function formatDateHeader(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / 86400000)
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fullDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (diffDays === 0) return `TODAY, ${monthDay.toUpperCase()}`
  if (diffDays === 1) return `YESTERDAY, ${monthDay.toUpperCase()}`
  return fullDate.toUpperCase()
}

export function getSessionDateForTimeline(session: Session): Date | null {
  const slot = getAgreedSessionSlot(session)
  if (slot) {
    const d = parseSlotToDate(slot)
    if (d) return d
  }
  if (session.preferredTimeFromStudent) {
    const d = parsePreferredTimeToDate(session.preferredTimeFromStudent)
    if (d) return d
  }
  return null
}

export function groupSessionsByTimelineDate(sessions: Session[]): Array<{
  dateKey: string
  headerDate: Date
  items: Session[]
}> {
  const groups: Record<string, Session[]> = {}
  for (const s of sessions) {
    const d = getSessionDateForTimeline(s) ?? s.updatedAt
    const key = d && !isNaN(d.getTime()) ? d.toDateString() : `fallback_${s.id}`
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }

  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => {
      const da =
        getSessionDateForTimeline(a)?.getTime() ?? a.updatedAt.getTime()
      const db =
        getSessionDateForTimeline(b)?.getTime() ?? b.updatedAt.getTime()
      return db - da
    })
  }

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a.startsWith('fallback_')) return 1
    if (b.startsWith('fallback_')) return -1
    const d1 = new Date(a).getTime()
    const d2 = new Date(b).getTime()
    return isNaN(d2) ? -1 : isNaN(d1) ? 1 : d2 - d1
  })

  return sortedKeys.map((k) => {
    const first = groups[k][0]
    const headerDate =
      getSessionDateForTimeline(first) ??
      first.updatedAt
    return { dateKey: k, headerDate, items: groups[k] }
  })
}
