"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyAnalyticsAi = void 0;
const https_1 = require("firebase-functions/v2/https");
const WEEKLY_ANALYTICS_SYSTEM_PROMPT = `You are an analytics assistant for AURORA, a student emotional tracking system.
Your role is to generate SAFE, NON-CLINICAL weekly summaries and suggestions based on mood, stress, and activity data.

STRICT RULES:
- Do NOT provide diagnostic analysis (do not explain causes of emotions)
- Do NOT make predictions about future mood or behavior
- Do NOT use clinical or medical language
- Do NOT label the user with any condition
- Only describe what is visible in the data — nothing more

INPUT: You will receive daily_mood (array 1–5, or -1 when no check-in), daily_stress ("Low"|"Moderate"|"High"|"None"), daily_tasks (count), and dates.
- "None" stress means no check-in that day.

OUTPUT — strict JSON only, no markdown, no extra text:
{
  "trend": "Improving | Declining | Stable",
  "summary": "short neutral weekly summary",
  "observations": ["observation 1", "observation 2"],
  "recommendations": ["suggestion 1", "suggestion 2"],
  "support_note": "optional gentle counselor suggestion or empty string"
}`;
function normalizeWeeklyPayload(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    const daily_mood = Array.isArray(o.daily_mood)
        ? o.daily_mood.filter((x) => typeof x === 'number')
        : [];
    const daily_stress = Array.isArray(o.daily_stress)
        ? o.daily_stress.filter((x) => typeof x === 'string')
        : [];
    const daily_tasks = Array.isArray(o.daily_tasks)
        ? o.daily_tasks.filter((x) => typeof x === 'number')
        : [];
    const dates = Array.isArray(o.dates)
        ? o.dates.filter((x) => typeof x === 'string')
        : [];
    if (daily_mood.length === 0 && daily_stress.length === 0)
        return null;
    return { daily_mood, daily_stress, daily_tasks, dates };
}
function parseWeeklyAnalyticsJson(raw) {
    try {
        const o = JSON.parse(raw);
        const trend = o.trend;
        if (trend !== 'Improving' && trend !== 'Declining' && trend !== 'Stable')
            return null;
        const summary = typeof o.summary === 'string' ? o.summary.trim() : '';
        if (!summary)
            return null;
        const observations = Array.isArray(o.observations)
            ? o.observations.filter((x) => typeof x === 'string')
            : [];
        const recommendations = Array.isArray(o.recommendations)
            ? o.recommendations.filter((x) => typeof x === 'string')
            : [];
        const support_note = typeof o.support_note === 'string' ? o.support_note : '';
        return { trend, summary, observations, recommendations, support_note };
    }
    catch {
        return null;
    }
}
exports.generateWeeklyAnalyticsAi = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    const data = (request.data ?? {});
    const weeklyData = normalizeWeeklyPayload(data.weeklyData);
    if (!weeklyData) {
        throw new https_1.HttpsError('invalid-argument', 'weeklyData is required.');
    }
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
    if (!openrouterKey) {
        throw new https_1.HttpsError('failed-precondition', 'AI summary unavailable.');
    }
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openrouterKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
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
                temperature: 0.5,
            }),
        });
        if (!res.ok) {
            throw new https_1.HttpsError('unavailable', 'AI summary unavailable.');
        }
        const json = (await res.json());
        const text = json.choices?.[0]?.message?.content?.trim();
        if (!text) {
            throw new https_1.HttpsError('unavailable', 'AI summary unavailable.');
        }
        const parsed = parseWeeklyAnalyticsJson(text);
        if (!parsed) {
            throw new https_1.HttpsError('unavailable', 'AI summary unavailable.');
        }
        return { ...parsed, fromAi: true };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('unavailable', 'AI summary unavailable.');
    }
});
//# sourceMappingURL=weeklyAnalyticsAi.js.map