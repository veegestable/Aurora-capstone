import { WEEKLY_ANALYTICS_SYSTEM_PROMPT } from '../../../constants/weeklyAnalyticsPrompt'
import {
  buildWeekPayload,
  parseAiResponse,
  deterministicFallback,
  type MoodLogEntry,
  type WeeklyAiResult,
} from '../helpers'

/**
 * Fetch a weekly AI narrative for the given mood logs.
 * Falls back to a deterministic summary if OpenAI is unavailable.
 *
 * Security note: calling OpenAI from the browser exposes the API key.
 * This matches the mobile pattern — flag for future backend proxy.
 */
export async function fetchWeeklyNarrative(
  moodLogs: MoodLogEntry[]
): Promise<WeeklyAiResult> {
  const payload = buildWeekPayload(moodLogs)
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined

  if (!apiKey?.trim()) return deterministicFallback(payload)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
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
