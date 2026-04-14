/**
 * One-time migration: legacy flat `mood_logs` → `moodLogs/{userId}/entries/{docId}_legacy`.
 *
 * If you previously stored one doc per day under `moodLogs/{userId}/…` (non-`entries` subcollections),
 * add a targeted pass for that layout before running against production.
 *
 * Deploy: `npm run deploy` from `functions/` (Firebase CLI). Callable: `migrateOldMoodLogs` (admin claim).
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Calendar YYYY-MM-DD in UTC (migration default when user timezone unknown). */
function dayKeyUtc(d: admin.firestore.Timestamp | Date): string {
  const date = d instanceof Date ? d : d.toDate();
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function emotionColor(name: string): string {
  const n = (name || '').toLowerCase();
  const map: Record<string, string> = {
    joy: '#FBBF24',
    happiness: '#FBBF24',
    happy: '#FBBF24',
    surprise: '#F97316',
    anger: '#EF4444',
    angry: '#EF4444',
    sadness: '#3B82F6',
    sad: '#3B82F6',
    neutral: '#9CA3AF',
  };
  return map[n] || '#888888';
}

type WeekSummaryInput = {
  weekLabel: string;
  dominantMood: string;
  averageIntensity: number;
  mostFrequentMood: string;
  bestDay: string;
  hardestDay: string;
  totalEntries: number;
  hadExamsOrDeadlines: boolean;
  dailyBreakdown: Array<{
    day: string;
    dominantMood: string;
    avgIntensity: number;
    entryCount: number;
  }>;
};

function buildTemplateWeeklySummary(data: WeekSummaryInput): string {
  if (data.totalEntries === 0) return 'No check-ins were recorded in this window.';
  const parts: string[] = [];
  parts.push(`You logged ${data.totalEntries} check-in${data.totalEntries === 1 ? '' : 's'} ${data.weekLabel}.`);
  parts.push(
    `Average intensity was about ${data.averageIntensity.toFixed(1)} (1–10), and the mood that appeared most often was ${data.mostFrequentMood}.`
  );
  if (data.bestDay !== '—' && data.hardestDay !== '—' && data.bestDay !== data.hardestDay) {
    parts.push(`You tended to rate highest on ${data.bestDay} and most strained on ${data.hardestDay}.`);
  }
  if (data.hadExamsOrDeadlines) {
    parts.push('At least one day included exams or deadlines in your workload context.');
  }
  return parts.join(' ');
}

export const generateWeeklySummaryAi = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const data = (request.data ?? {}) as Partial<WeekSummaryInput>;
  const normalized: WeekSummaryInput = {
    weekLabel: typeof data.weekLabel === 'string' ? data.weekLabel : 'this week',
    dominantMood: typeof data.dominantMood === 'string' ? data.dominantMood : '—',
    averageIntensity: typeof data.averageIntensity === 'number' ? data.averageIntensity : 0,
    mostFrequentMood: typeof data.mostFrequentMood === 'string' ? data.mostFrequentMood : '—',
    bestDay: typeof data.bestDay === 'string' ? data.bestDay : '—',
    hardestDay: typeof data.hardestDay === 'string' ? data.hardestDay : '—',
    totalEntries: typeof data.totalEntries === 'number' ? data.totalEntries : 0,
    hadExamsOrDeadlines: !!data.hadExamsOrDeadlines,
    dailyBreakdown: Array.isArray(data.dailyBreakdown)
      ? data.dailyBreakdown.map((x) => ({
          day: typeof x?.day === 'string' ? x.day : '—',
          dominantMood: typeof x?.dominantMood === 'string' ? x.dominantMood : '—',
          avgIntensity: typeof x?.avgIntensity === 'number' ? x.avgIntensity : 0,
          entryCount: typeof x?.entryCount === 'number' ? x.entryCount : 0,
        }))
      : [],
  };

  const fallback = buildTemplateWeeklySummary(normalized);
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
  if (!openrouterKey) {
    return { summary: fallback, fromAi: false };
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
          {
            role: 'system',
            content:
              "You are Aurora, a warm academic mood assistant. Write a 2-3 sentence weekly summary for a student based on structured mood data. Tone: supportive, non-clinical. Use 'you'. No bullet points. Don't mention the app.",
          },
          { role: 'user', content: JSON.stringify(normalized) },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) {
      return { summary: fallback, fromAi: false };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { summary: fallback, fromAi: false };
    }
    return { summary: text, fromAi: true };
  } catch {
    return { summary: fallback, fromAi: false };
  }
});

export const migrateOldMoodLogs = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  // Restrict to the caller or elevate via custom claims in production.
  const allow = request.auth.token.admin === true || request.auth.token.migrateMood === true;
  if (!allow) {
    throw new HttpsError('permission-denied', 'Admin or migrateMood claim required.');
  }

  let moved = 0;
  let deleted = 0;

  // 1) Flat collection mood_logs (current Aurora mobile schema)
  const flat = await db.collection('mood_logs').get();
  for (const doc of flat.docs) {
    const d = doc.data();
    const uid = d.user_id as string | undefined;
    if (!uid) continue;
    const logTs = d.log_date as admin.firestore.Timestamp | undefined;
    if (!logTs) continue;
    const logDate = logTs.toDate();
    const emotions = Array.isArray(d.emotions) ? d.emotions : [];
    const primary = emotions[0] || { emotion: 'neutral', confidence: 0.5, color: '#888888' };
    const mood = String(primary.emotion || 'neutral');
    const conf = typeof primary.confidence === 'number' ? primary.confidence : 0.5;
    const intensity = Math.max(1, Math.min(10, Math.round(conf * 10)));
    const stress = Math.max(1, Math.min(5, Math.round(Number(d.stress_level ?? 5) / 2)));
    const energy = Math.max(1, Math.min(5, Math.round(Number(d.energy_level ?? 5) / 2)));
    const color = String(primary.color || emotionColor(mood));
    const dayKey = dayKeyUtc(logTs);

    const entryId = `${doc.id}_legacy`;
    const entryRef = db.collection('moodLogs').doc(uid).collection('entries').doc(entryId);
    await entryRef.set({
      mood,
      intensity,
      stress,
      energy,
      timestamp: logTs,
      color,
      dayKey,
    });
    moved++;
    await doc.ref.delete();
    deleted++;
  }

  return { ok: true, moved, deleted };
});
