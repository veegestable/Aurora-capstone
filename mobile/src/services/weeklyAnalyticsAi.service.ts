/**
 * Weekly analytics via OpenAI (gpt-4o-mini, JSON mode).
 * Falls back to deterministic descriptive copy if the API is unavailable or invalid.
 *
 * Set EXPO_PUBLIC_OPENAI_API_KEY in the environment for production-like runs.
 * Capstone note: embedding keys in the client is not secure; prefer a backend proxy later.
 */

import Constants from 'expo-constants';
import { WEEKLY_ANALYTICS_SYSTEM_PROMPT } from '../constants/weeklyAnalyticsPrompt';
import {
    buildLast7DaysPayload,
    summarizeWeekSeries,
    type WeeklySeriesPayload,
} from '../utils/analytics/weeklySeries';
import type { MoodData } from './firebase-firestore.service';
import { moodService } from './mood.service';

/** Shown when live OpenAI is unavailable — student-friendly, not technical. */
export const WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO =
    "Your weekly summary is taking a moment. Here's a quick overview based on your logs.";

export type WeeklyTrend = 'Improving' | 'Declining' | 'Stable';

export interface WeeklyAiResult {
    trend: WeeklyTrend;
    summary: string;
    observations: string[];
    recommendations: string[];
    support_note: string;
    /** True when OpenAI returned valid JSON; false when fallback was used. */
    fromAi: boolean;
}

function getOpenAiKey(): string | undefined {
    const extra = Constants.expoConfig?.extra as { openAiApiKey?: string } | undefined;
    const fromExtra = typeof extra?.openAiApiKey === 'string' ? extra.openAiApiKey.trim() : '';
    if (fromExtra.length > 0) return fromExtra;
    const fromEnv =
        typeof process.env.EXPO_PUBLIC_OPENAI_API_KEY === 'string'
            ? process.env.EXPO_PUBLIC_OPENAI_API_KEY.trim()
            : '';
    return fromEnv.length > 0 ? fromEnv : undefined;
}

function isWeeklyTrend(s: string): s is WeeklyTrend {
    return s === 'Improving' || s === 'Declining' || s === 'Stable';
}

function parseWeeklyJson(raw: string): WeeklyAiResult | null {
    try {
        const o = JSON.parse(raw) as Record<string, unknown>;
        const trend = typeof o.trend === 'string' && isWeeklyTrend(o.trend) ? o.trend : null;
        const summary = typeof o.summary === 'string' ? o.summary : null;
        const observations = Array.isArray(o.observations)
            ? o.observations.filter((x) => typeof x === 'string')
            : [];
        const recommendations = Array.isArray(o.recommendations)
            ? o.recommendations.filter((x) => typeof x === 'string')
            : [];
        const support_note = typeof o.support_note === 'string' ? o.support_note : '';
        if (!trend || !summary) return null;
        return {
            trend,
            summary,
            observations,
            recommendations,
            support_note,
            fromAi: true,
        };
    } catch {
        return null;
    }
}

/** Observable week-over-week mood slope; descriptive label only (no forecasting). */
export function deterministicWeeklyFallback(payload: WeeklySeriesPayload): WeeklyAiResult {
    const moods = payload.daily_mood.map((m, i) => (m >= 1 && m <= 5 ? { m, i } : null)).filter(Boolean) as {
        m: number;
        i: number;
    }[];
    let trend: WeeklyTrend = 'Stable';
    if (moods.length >= 4) {
        const mid = Math.floor(moods.length / 2);
        const first = moods.slice(0, mid);
        const second = moods.slice(mid);
        const a1 = first.reduce((s, x) => s + x.m, 0) / first.length;
        const a2 = second.reduce((s, x) => s + x.m, 0) / second.length;
        if (a2 - a1 >= 0.35) trend = 'Improving';
        else if (a1 - a2 >= 0.35) trend = 'Declining';
    }

    const { avgMood, dominantStress, totalTasks } = summarizeWeekSeries(payload);
    const daysWithCheckIn = payload.daily_mood.filter((m) => m >= 1 && m <= 5).length;
    const lowMoodDays = payload.daily_mood.filter((m) => m >= 1 && m <= 2).length;
    const highStressDays = payload.daily_stress.filter((s) => s === 'High').length;

    const summaryParts: string[] = [];
    if (daysWithCheckIn === 0) {
        summaryParts.push('No check-ins were recorded in this window.');
    } else {
        if (avgMood != null) summaryParts.push(`Average mood scale was about ${avgMood.toFixed(1)} (1–5).`);
        if (dominantStress !== '—') summaryParts.push(`Recorded stress levels were most often ${dominantStress}.`);
        summaryParts.push(`${daysWithCheckIn} day(s) included a check-in.`);
    }

    const observations: string[] = [];
    if (daysWithCheckIn > 0) {
        if (totalTasks === 0) {
            observations.push('No tasks were listed on your check-ins this week.');
        } else {
            observations.push(`You listed ${totalTasks} task${totalTasks === 1 ? '' : 's'} across your check-ins this week.`);
        }
        if (dominantStress === 'Low') {
            observations.push('Most of your logged days looked calmer on the Stress Index.');
        } else if (dominantStress === 'Moderate') {
            observations.push('Most logged days sat in the middle on the Stress Index.');
        } else if (dominantStress === 'High') {
            observations.push('Several logged days showed a higher Stress Index.');
        } else {
            observations.push('Keep logging a few more days to see a clearer Stress Index pattern.');
        }
    } else {
        observations.push('No check-ins in this window yet — your summary will fill in as you log.');
    }

    const recommendations: string[] = [
        'Consider short breaks between study blocks when your schedule feels full.',
        'Use a simple list to spread tasks across the week when possible.',
    ];

    let support_note = '';
    if (lowMoodDays >= 2 || highStressDays >= 2) {
        support_note =
            'If you would like support, you can reach out to a guidance counselor through the app.';
    }

    return {
        trend,
        summary: summaryParts.join(' ') || 'Weekly data was limited; keep logging to see clearer patterns.',
        observations,
        recommendations,
        support_note,
        fromAi: false,
    };
}

export async function getLast7Days(userId: string): Promise<WeeklySeriesPayload> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 21);
    const logs = await moodService.getMoodLogs(userId, start.toISOString(), end.toISOString());
    const normalized = (logs || []) as (MoodData & { log_date: Date })[];
    return buildLast7DaysPayload(normalized);
}

/**
 * Weekly AI summary from an already-built 7-day payload (avoids duplicate Firestore reads).
 */
export async function fetchWeeklyAiAnalyticsWithPayload(weeklyData: WeeklySeriesPayload): Promise<WeeklyAiResult> {
    const key = getOpenAiKey();
    if (!key) {
        return deterministicWeeklyFallback(weeklyData);
    }

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: WEEKLY_ANALYTICS_SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            ...weeklyData,
                            note: 'daily_mood uses -1 when there was no check-in; daily_stress uses None in that case.',
                        }),
                    },
                ],
                response_format: { type: 'json_object' },
            }),
        });

        if (!res.ok) {
            let detail = '';
            try {
                const errBody = await res.text();
                const parsed = JSON.parse(errBody) as { error?: { message?: string } };
                detail = parsed?.error?.message || errBody.slice(0, 200);
            } catch {
                /* ignore */
            }
            console.warn('[weeklyAnalyticsAi] OpenAI HTTP', res.status, detail);
            return deterministicWeeklyFallback(weeklyData);
        }

        const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string | null } }>;
        };
        const raw = body.choices?.[0]?.message?.content;
        if (!raw || typeof raw !== 'string') {
            return deterministicWeeklyFallback(weeklyData);
        }

        const parsed = parseWeeklyJson(raw);
        if (!parsed) {
            return deterministicWeeklyFallback(weeklyData);
        }
        return parsed;
    } catch (e) {
        console.warn('[weeklyAnalyticsAi] request failed', e);
        return deterministicWeeklyFallback(weeklyData);
    }
}

export async function fetchWeeklyAiAnalytics(userId: string): Promise<WeeklyAiResult> {
    const weeklyData = await getLast7Days(userId);
    return fetchWeeklyAiAnalyticsWithPayload(weeklyData);
}
