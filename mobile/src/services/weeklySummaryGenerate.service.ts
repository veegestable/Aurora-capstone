import type { MoodData } from './firebase-firestore.service';
import { getDayKey } from '../utils/dayKey';
import { moodLogsToMoodEntries } from '../utils/moodEntryNormalize';
import { aggregateByDay, aggregateEntriesAsSingleDay } from '../utils/moodAggregates';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface WeekSummaryInput {
  weekLabel: string;
  dominantMood: string;
  averageIntensity: number;
  mostFrequentMood: string;
  bestDay: string;
  hardestDay: string;
  totalEntries: number;
  dailyBreakdown: {
    day: string;
    dominantMood: string;
    avgIntensity: number;
    entryCount: number;
  }[];
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const functions = getFunctions();

export function buildTemplateWeeklySummary(data: WeekSummaryInput): string {
  if (data.totalEntries === 0) {
    return 'No check-ins were recorded in this window.';
  }
  const parts: string[] = [];
  parts.push(
    `You logged ${data.totalEntries} check-in${data.totalEntries === 1 ? '' : 's'} ${data.weekLabel}.`
  );
  parts.push(
    `Average intensity was about ${data.averageIntensity.toFixed(1)} (1–10), and the mood that appeared most often was ${data.mostFrequentMood}.`
  );
  if (data.bestDay !== '—' && data.hardestDay !== '—' && data.bestDay !== data.hardestDay) {
    parts.push(`You tended to rate highest on ${data.bestDay} and most strained on ${data.hardestDay}.`);
  }
  return parts.join(' ');
}

/**
 * Phase B — AI weekly summary via OpenRouter.
 * Falls back to deterministic template if API key/network/model is unavailable.
 */
export async function generateWeeklySummary(data: WeekSummaryInput): Promise<string> {
  const fallback = buildTemplateWeeklySummary(data);

  try {
    const callable = httpsCallable<WeekSummaryInput, { summary?: string }>(
      functions,
      'generateWeeklySummaryAi'
    );
    const resp = await callable(data);
    const text = resp.data?.summary?.trim();
    if (!text) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

export function buildWeekSummaryInput(
  logs: (MoodData & { log_date: Date })[],
  resetHour: number,
  timezone: string,
  weekLabel = 'this week'
): WeekSummaryInput {
  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dayKeys.push(getDayKey(d, resetHour, timezone));
  }

  const entries = moodLogsToMoodEntries(logs, resetHour, timezone).filter((e) =>
    dayKeys.includes(e.dayKey || '')
  );

  const moods = entries.map((e) => e.mood.toLowerCase());
  const counts: Record<string, number> = {};
  for (const m of moods) counts[m] = (counts[m] ?? 0) + 1;
  let mostFrequentMood = '—';
  let mc = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > mc) {
      mc = v;
      mostFrequentMood = k;
    }
  }

  const averageIntensity =
    entries.length > 0 ? entries.reduce((s, e) => s + e.intensity, 0) / entries.length : 0;

  const dailyBreakdown = dayKeys.map((dk) => {
    const agg = aggregateByDay(entries, dk);
    const [y, m, d] = dk.split('-').map(Number);
    const wd = DOW[new Date(y, m - 1, d).getDay()];
    return {
      day: wd,
      dominantMood: agg.dominantMood,
      avgIntensity: agg.avgIntensity,
      entryCount: agg.entryCount,
    };
  });

  let bestDay = '—';
  let bestI = -1;
  let hardestDay = '—';
  let hardestRank = Infinity;
  for (let i = 0; i < dayKeys.length; i++) {
    const agg = aggregateByDay(entries, dayKeys[i]);
    if (agg.entryCount === 0) continue;
    if (agg.avgIntensity > bestI) {
      bestI = agg.avgIntensity;
      bestDay = dailyBreakdown[i].day;
    }
    const rank = agg.avgIntensity * -1 + agg.avgStress;
    if (rank < hardestRank) {
      hardestRank = rank;
      hardestDay = dailyBreakdown[i].day;
    }
  }

  const roll = aggregateEntriesAsSingleDay(entries);
  return {
    weekLabel,
    dominantMood: roll.dominantMood,
    averageIntensity: averageIntensity,
    mostFrequentMood,
    bestDay,
    hardestDay,
    totalEntries: entries.length,
    dailyBreakdown,
  };
}
