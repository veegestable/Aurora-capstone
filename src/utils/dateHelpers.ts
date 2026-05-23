/** Shared schedule/date parsing — aligned with mobile `dateHelpers.ts`. */

export function normalizeScheduleWhitespace(input: string): string {
  return input
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2007/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parsePreferredTimeToDate(preferredTime: string): Date | null {
  if (!preferredTime?.trim()) return null
  try {
    const cleaned = normalizeScheduleWhitespace(preferredTime).replace(/\s+at\s+/i, ', ')
    const parsed = new Date(cleaned)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

function parseTimePartsOnDate(
  baseYear: number,
  baseMonth: number,
  baseDay: number,
  timeStr: string,
): Date | null {
  const t = normalizeScheduleWhitespace(timeStr)
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const minute = parseInt(m[2], 10)
  const ap = m[4]?.toUpperCase()
  if (ap === 'PM' && hour < 12) hour += 12
  if (ap === 'AM' && hour === 12) hour = 0
  if (!ap && hour > 23) return null
  return new Date(baseYear, baseMonth, baseDay, hour, minute, 0, 0)
}

export function parseSlotToDate(slot: { date: string; time: string } | null): Date | null {
  if (!slot?.date) return null
  const datePart = normalizeScheduleWhitespace(String(slot.date))
  const timePart = slot.time != null ? normalizeScheduleWhitespace(String(slot.time)) : ''
  if (!datePart) return null

  const tryCombined = (a: string): Date | null => {
    const normalized = normalizeScheduleWhitespace(a.replace(/\s+at\s+/i, ', '))
    const parsed = new Date(normalized)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  if (timePart) {
    for (const c of [`${datePart}, ${timePart}`, `${datePart} ${timePart}`, `${datePart}T${timePart}`]) {
      const d = tryCombined(c)
      if (d) return d
    }
  }

  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const y = parseInt(iso[1], 10)
    const mo = parseInt(iso[2], 10) - 1
    const day = parseInt(iso[3], 10)
    if (timePart) {
      const withTime = parseTimePartsOnDate(y, mo, day, timePart)
      if (withTime) return withTime
    }
    return new Date(y, mo, day, 23, 59, 59, 999)
  }

  const dateOnlyTry = new Date(datePart)
  if (!isNaN(dateOnlyTry.getTime())) {
    const y = dateOnlyTry.getFullYear()
    const mo = dateOnlyTry.getMonth()
    const day = dateOnlyTry.getDate()
    if (timePart) {
      const withTime = parseTimePartsOnDate(y, mo, day, timePart)
      if (withTime) return withTime
    }
    return new Date(y, mo, day, 23, 59, 59, 999)
  }

  if (timePart) {
    const viaPreferred = parsePreferredTimeToDate(`${datePart} at ${timePart}`)
    if (viaPreferred) return viaPreferred
    const viaPreferred2 = parsePreferredTimeToDate(`${datePart}, ${timePart}`)
    if (viaPreferred2) return viaPreferred2
  }

  return parseEnglishMonthDayYearWithTime(datePart, timePart)
}

const ENGLISH_MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

function parseEnglishMonthDayYearWithTime(datePart: string, timePart: string): Date | null {
  const n = normalizeScheduleWhitespace(datePart)
  const dm = n.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (!dm) return null
  const mon = ENGLISH_MONTHS[dm[1].toLowerCase()]
  if (mon === undefined) return null
  const day = parseInt(dm[2], 10)
  const year = parseInt(dm[3], 10)
  const tp = timePart ? normalizeScheduleWhitespace(timePart) : ''
  if (!tp) return new Date(year, mon, day, 23, 59, 59, 999)
  const tm = tp.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i)
  if (!tm) return new Date(year, mon, day, 23, 59, 59, 999)
  let hour = parseInt(tm[1], 10)
  const minute = parseInt(tm[2], 10)
  const ap = tm[4]?.toUpperCase()
  if (ap === 'PM' && hour < 12) hour += 12
  if (ap === 'AM' && hour === 12) hour = 0
  if (!ap && hour > 23) return null
  return new Date(year, mon, day, hour, minute, 0, 0)
}

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000
const OPEN_SESSION_REQUEST_24H_STATUSES: ReadonlySet<string> = new Set(['requested', 'pending'])

function firestoreLikeToMs(v: unknown): number {
  if (v == null) return NaN
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    const n = (v as { toMillis: () => number }).toMillis()
    return typeof n === 'number' && !isNaN(n) ? n : NaN
  }
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    const d = (v as { toDate: () => Date }).toDate()
    const t = d.getTime()
    return isNaN(t) ? NaN : t
  }
  if (v instanceof Date) {
    const t = v.getTime()
    return isNaN(t) ? NaN : t
  }
  return NaN
}

export function isSessionDocOpenRequestExpired24h(params: {
  status: string
  createdAt?: unknown
  updatedAt?: unknown
  nowMs?: number
}): boolean {
  const st = params.status.toLowerCase()
  if (!OPEN_SESSION_REQUEST_24H_STATUSES.has(st)) return false
  const nowMs = params.nowMs ?? Date.now()
  const createdMs = firestoreLikeToMs(params.createdAt)
  const updatedMs = firestoreLikeToMs(params.updatedAt)
  const anchorMs =
    st === 'requested'
      ? createdMs
      : Math.max(
          Number.isFinite(createdMs) ? createdMs : -Infinity,
          Number.isFinite(updatedMs) ? updatedMs : -Infinity,
        )
  if (!Number.isFinite(anchorMs)) return false
  return nowMs - anchorMs >= TWENTY_FOUR_H_MS
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSessionScheduledTimeReached(
  slot: { date: string; time: string } | null,
  opts?: { scheduledStartMs?: number | null },
): boolean {
  if (opts?.scheduledStartMs != null && Number.isFinite(opts.scheduledStartMs)) {
    return opts.scheduledStartMs <= Date.now()
  }
  const parsed = parseSlotToDate(slot)
  return parsed != null && !isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()
}

export function isSessionTimeExpired(preferredTime: string): boolean {
  const date = parsePreferredTimeToDate(preferredTime)
  return date ? date.getTime() < Date.now() : false
}

export function isOpenSessionRequestExpired(params: {
  status: string
  preferredTime?: string
  requestedAtMs?: number | null
  now?: Date
}): boolean {
  const { status, preferredTime, requestedAtMs, now = new Date() } = params
  const st = status.toLowerCase()
  if (st === 'needs_rescheduling') {
    return !!(preferredTime?.trim() && isSessionTimeExpired(preferredTime))
  }
  if (!OPEN_SESSION_REQUEST_24H_STATUSES.has(st)) return false
  if (preferredTime?.trim() && isSessionTimeExpired(preferredTime)) return true
  const nowMs = now.getTime()
  if (requestedAtMs != null && Number.isFinite(requestedAtMs)) {
    if (nowMs - requestedAtMs >= TWENTY_FOUR_H_MS) return true
  }
  return false
}
