import { WEEKLY_ANALYTICS_SYSTEM_PROMPT } from '../../../constants/weeklyAnalyticsPrompt'
import {
  buildWeekPayload,
  parseAiResponse,
  deterministicFallback,
  type MoodLogEntry,
  type WeeklyAiResult,
} from '../helpers'

const CACHE_PREFIX = 'aurora_weekly_narrative_'

/** Build a cache key scoped to user + calendar day. */
function cacheKey(userId: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${userId}_${today}`
}

/** Read cached result from localStorage. Returns null if missing or expired. */
function readCache(userId: string): WeeklyAiResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeeklyAiResult
    // Basic shape check — if it has trend + summary, it's valid
    if (parsed.trend && parsed.summary) return parsed
    return null
  } catch {
    return null
  }
}

/** Write result to localStorage. Also cleans up old day keys. */
function writeCache(userId: string, result: WeeklyAiResult): void {
  try {
    const key = cacheKey(userId)
    localStorage.setItem(key, JSON.stringify(result))

    // Prune stale entries (older days) to avoid localStorage bloat
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX) && k !== key) {
        localStorage.removeItem(k)
      }
    }
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/** Call OpenAI (or fallback) and return the narrative. */
async function callApi(moodLogs: MoodLogEntry[]): Promise<WeeklyAiResult> {
  const payload = buildWeekPayload(moodLogs)
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined

  if (!apiKey?.trim()) return deterministicFallback(payload)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Aurora Capstone',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: WEEKLY_ANALYTICS_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              ...payload,
              note: 'daily_mood uses -1 when there was no check-in; daily_stress uses None in that case.',
            }),
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      console.warn('[weeklyNarrative] OpenAI HTTP', res.status)
      return deterministicFallback(payload)
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const raw = body.choices?.[0]?.message?.content
    if (!raw || typeof raw !== 'string') return deterministicFallback(payload)

    return parseAiResponse(raw) ?? deterministicFallback(payload)
  } catch (err) {
    console.warn('[weeklyNarrative] request failed', err)
    return deterministicFallback(payload)
  }
}

/**
 * Fetch a weekly AI narrative for the given mood logs.
 * Results are cached per user per calendar day in localStorage.
 *
 * @param userId  - Used as the cache key scope.
 * @param moodLogs - Last ~21 days of mood logs.
 * @param forceRefresh - Skip cache and call the API fresh (e.g. manual refresh button).
 */
export async function fetchWeeklyNarrative(
  userId: string,
  moodLogs: MoodLogEntry[],
  forceRefresh = false,
): Promise<WeeklyAiResult> {
  if (!forceRefresh) {
    const cached = readCache(userId)
    if (cached) return cached
  }

  const result = await callApi(moodLogs)
  writeCache(userId, result)
  return result
}
