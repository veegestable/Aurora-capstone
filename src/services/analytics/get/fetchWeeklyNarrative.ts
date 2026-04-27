import { httpsCallable } from 'firebase/functions'
import { functions } from '../../../config/firebase'
import {
  buildWeekSummaryInput,
  buildTemplateWeeklySummary,
  type MoodLogEntry,
  type WeeklySummaryResult,
  type WeekSummaryInput
} from '../helpers'

const CACHE_PREFIX = 'aurora_weekly_narrative_v2_'

function cacheKey(userId: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${userId}_${today}`
}

function readCache(userId: string): WeeklySummaryResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeeklySummaryResult
    if (parsed.summary) return parsed
    return null
  } catch {
    return null
  }
}

function writeCache(userId: string, result: WeeklySummaryResult): void {
  try {
    const key = cacheKey(userId)
    localStorage.setItem(key, JSON.stringify(result))

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX) && k !== key) {
        localStorage.removeItem(k)
      }
    }
  } catch {
    // silent
  }
}

export async function fetchWeeklyNarrative(
  userId: string,
  moodLogs: MoodLogEntry[],
  forceRefresh = false,
): Promise<WeeklySummaryResult> {
  if (!forceRefresh) {
    const cached = readCache(userId)
    if (cached) return cached
  }

  const payload = buildWeekSummaryInput(moodLogs)
  const fallback = buildTemplateWeeklySummary(payload)

  let result: WeeklySummaryResult
  try {
    const callable = httpsCallable<WeekSummaryInput, { summary?: string; fromAi?: boolean }>(
      functions,
      'generateWeeklySummaryAi'
    )
    const resp = await callable(payload)
    const text = resp.data?.summary?.trim()
    
    if (!text) {
      result = { summary: fallback, source: 'fallback' }
    } else {
      result = { summary: text, source: resp.data?.fromAi ? 'ai' : 'fallback' }
    }
  } catch (err) {
    console.warn('[weeklyNarrative] cloud function failed', err)
    result = { summary: fallback, source: 'fallback' }
  }

  writeCache(userId, result)
  return result
}