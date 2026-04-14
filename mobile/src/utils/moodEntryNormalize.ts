import type { MoodData } from '../services/firebase-firestore.service';
import { getDayKey } from './dayKey';
import type { MoodEntry } from './moodAggregates';
import { AURORA } from '../constants/aurora-colors';

const EMOTION_COLOR_MAP: Record<string, string> = {
  joy: AURORA.moodHappy,
  happiness: AURORA.moodHappy,
  happy: AURORA.moodHappy,
  surprise: AURORA.moodSurprise,
  surprised: AURORA.moodSurprise,
  anger: AURORA.moodAngry,
  angry: AURORA.moodAngry,
  sadness: AURORA.moodSad,
  sad: AURORA.moodSad,
  neutral: AURORA.moodNeutral,
};

function emotionColor(name: string): string {
  const n = name.toLowerCase().trim();
  return EMOTION_COLOR_MAP[n] || AURORA.moodNeutral;
}

/** Map legacy 1–10 stress/energy to 1–5 scale for aggregates. */
export function scaleLegacyToFive(v: number | undefined, fallback: number): number {
  const x = Number(v);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(5, Math.max(1, Math.round(x / 2)));
}

/**
 * Normalize a Firestore mood row (legacy `mood_logs` or merged shape) to a MoodEntry for analytics.
 */
export function moodDataToMoodEntry(
  log: MoodData & { log_date: Date; mood?: string; intensity?: number; color?: string; dayKey?: string },
  resetHour: number,
  timezone: string
): MoodEntry {
  const logDate = log.log_date instanceof Date ? log.log_date : new Date(log.log_date);
  const primary = log.emotions?.[0];
  const mood =
    (log as { mood?: string }).mood ||
    primary?.emotion ||
    'neutral';
  let intensity = (log as { intensity?: number }).intensity;
  if (intensity == null || !Number.isFinite(intensity)) {
    const c = primary?.confidence;
    if (typeof c === 'number' && c > 0 && c <= 1) {
      intensity = Math.max(1, Math.min(10, Math.round(c * 10)));
    } else {
      const e = log.energy_level ?? 5;
      intensity = Math.max(1, Math.min(10, Math.round(e)));
    }
  } else {
    intensity = Math.max(1, Math.min(10, Math.round(intensity)));
  }
  const stress = scaleLegacyToFive(log.stress_level, 3);
  const energy = scaleLegacyToFive(log.energy_level, 3);
  const color =
    (log as { color?: string }).color ||
    primary?.color ||
    emotionColor(mood);
  const dayKey =
    (log as { dayKey?: string }).dayKey || getDayKey(logDate, resetHour, timezone);
  return {
    mood,
    intensity,
    stress,
    energy,
    timestamp: logDate,
    color,
    dayKey,
  };
}

export function moodLogsToMoodEntries(
  logs: (MoodData & { log_date: Date; mood?: string; intensity?: number; color?: string; dayKey?: string })[],
  resetHour: number,
  timezone: string
): MoodEntry[] {
  return logs.map((l) => moodDataToMoodEntry(l, resetHour, timezone));
}
