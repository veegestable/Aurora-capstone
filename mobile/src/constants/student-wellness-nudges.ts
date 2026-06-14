/**
 * Student wellness pattern nudges — consecutive-day self-reports → Zen breath suggestion.
 * Non-clinical; sad and angry streaks use separate descriptive copy + motivational lines.
 */

import { calendarDayKeyLocal } from "../utils/dayKey";
import {
  energyLevelToFive,
  stressLevelToFive,
} from "./counselor-pattern-indicators";

/** Consecutive calendar days (including today) required to trigger a wellness nudge. */
export const WELLNESS_CONSECUTIVE_DAYS_REQUIRED = 3;
export const WELLNESS_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const ELEVATED_STRESS_THRESHOLD_FIVE = 4;
export const LOW_ENERGY_THRESHOLD_FIVE = 2;

export type StudentWellnessNudgeId =
  | "elevated_stress_streak"
  | "low_energy_streak"
  | "sad_streak"
  | "angry_streak";

export interface StudentWellnessNudgeLogLike {
  log_date?: Date | string;
  dayKey?: string;
  stress_level?: number;
  energy_level?: number;
  stress?: number;
  energy?: number;
  mood?: string;
  emotions?: Array<{ emotion?: string; confidence?: number }>;
  intensity?: number;
}

export interface StudentWellnessNudgeCopy {
  id: StudentWellnessNudgeId;
  exerciseId: string;
  bannerTitle: string;
  bannerBody: string;
  motivationLine: string;
  pushTitle: string;
  pushBody: string;
}

interface StudentDailyRow {
  dayKey: string;
  maxStress: number | null;
  minEnergy: number | null;
  dominantMood: string | null;
}

function parseLogDate(log: StudentWellnessNudgeLogLike): Date | null {
  if (log.log_date instanceof Date) return log.log_date;
  if (typeof log.log_date === "string") {
    const d = new Date(log.log_date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function dayKeyFromLog(log: StudentWellnessNudgeLogLike): string | null {
  if (typeof log.dayKey === "string" && log.dayKey.trim()) {
    return log.dayKey.trim();
  }
  const d = parseLogDate(log);
  return d ? calendarDayKeyLocal(d) : null;
}

function moodFromLog(log: StudentWellnessNudgeLogLike): string {
  const primary = log.emotions?.[0]?.emotion;
  const raw = (primary ?? log.mood ?? "neutral").toLowerCase().trim();
  if (raw === "sadness") return "sad";
  if (raw === "anger") return "angry";
  return raw;
}

function intensityFromLog(log: StudentWellnessNudgeLogLike): number {
  if (typeof log.intensity === "number" && Number.isFinite(log.intensity)) {
    return Math.max(1, log.intensity);
  }
  const c = log.emotions?.[0]?.confidence;
  if (typeof c === "number" && c > 0) {
    return Math.max(1, Math.min(10, Math.round(c * 10)));
  }
  return 5;
}

function aggregateStudentDays(logs: StudentWellnessNudgeLogLike[]): StudentDailyRow[] {
  const byDay = new Map<
    string,
    {
      maxStress: number | null;
      minEnergy: number | null;
      moodIntensity: Record<string, number>;
    }
  >();

  for (const log of logs) {
    const key = dayKeyFromLog(log);
    if (!key) continue;

    const entry = byDay.get(key) ?? {
      maxStress: null,
      minEnergy: null,
      moodIntensity: {},
    };

    const stress = stressLevelToFive(log.stress ?? log.stress_level);
    if (stress != null) {
      entry.maxStress =
        entry.maxStress == null ? stress : Math.max(entry.maxStress, stress);
    }

    const energy = energyLevelToFive(log.energy ?? log.energy_level);
    if (energy != null) {
      entry.minEnergy =
        entry.minEnergy == null ? energy : Math.min(entry.minEnergy, energy);
    }

    const mood = moodFromLog(log);
    const intensity = intensityFromLog(log);
    entry.moodIntensity[mood] =
      (entry.moodIntensity[mood] ?? 0) + intensity;

    byDay.set(key, entry);
  }

  return [...byDay.entries()].map(([dayKey, v]) => {
    let dominantMood: string | null = null;
    let best = -1;
    for (const [mood, sum] of Object.entries(v.moodIntensity)) {
      if (sum > best) {
        best = sum;
        dominantMood = mood;
      }
    }
    return {
      dayKey,
      maxStress: v.maxStress,
      minEnergy: v.minEnergy,
      dominantMood,
    };
  });
}

/** Consecutive calendar days ending today (inclusive) matching predicate. */
export function consecutiveDaysEndingToday(
  dailies: StudentDailyRow[],
  predicate: (d: StudentDailyRow) => boolean,
  fromDate = new Date(),
): number {
  const byKey = new Map(dailies.map((d) => [d.dayKey, d]));
  let streak = 0;
  const cursor = new Date(fromDate);
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const key = calendarDayKeyLocal(cursor);
    const row = byKey.get(key);
    if (!row || !predicate(row)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isSadStreakDay(d: StudentDailyRow): boolean {
  return (d.dominantMood ?? "").toLowerCase() === "sad";
}

function isAngryStreakDay(d: StudentDailyRow): boolean {
  return (d.dominantMood ?? "").toLowerCase() === "angry";
}

export function wellnessNudgeCopyForId(
  id: StudentWellnessNudgeId,
): StudentWellnessNudgeCopy {
  switch (id) {
    case "sad_streak":
      return {
        id,
        exerciseId: "coherent",
        bannerTitle: "Your recent check-ins",
        bannerBody: "You've logged sad moods several days in a row.",
        motivationLine:
          "That's okay — checking in helps. Take a breath; a short reset might help today.",
        pushTitle: "A moment for you",
        pushBody:
          "You've logged sad moods several days in a row. Open Zen for a short breath when you're ready.",
      };
    case "angry_streak":
      return {
        id,
        exerciseId: "478",
        bannerTitle: "Your recent check-ins",
        bannerBody: "You've logged angry moods several days in a row.",
        motivationLine:
          "It's okay to feel this way. A short breath can help you reset when you're ready.",
        pushTitle: "A moment for you",
        pushBody:
          "You've logged angry moods several days in a row. Open Zen for a short breath when you're ready.",
      };
    case "elevated_stress_streak":
      return {
        id,
        exerciseId: "box",
        bannerTitle: "Your recent check-ins",
        bannerBody:
          "You've reported higher stress several days in a row.",
        motivationLine:
          "Take a breath — a short reset might help today.",
        pushTitle: "A moment for you",
        pushBody:
          "You've had a full few days. A short breath in Zen might help you reset.",
      };
    case "low_energy_streak":
      return {
        id,
        exerciseId: "478",
        bannerTitle: "Your recent check-ins",
        bannerBody: "Your energy has been low several days in a row.",
        motivationLine:
          "You're allowed to pause. Try a gentle breathing exercise when you're ready.",
        pushTitle: "A moment for you",
        pushBody:
          "Your week has felt low on energy. Open Zen for a gentle breath when you can.",
      };
  }
}

const NUDGE_CHECKS: Array<{
  id: StudentWellnessNudgeId;
  predicate: (d: StudentDailyRow) => boolean;
}> = [
  { id: "sad_streak", predicate: isSadStreakDay },
  { id: "angry_streak", predicate: isAngryStreakDay },
  {
    id: "elevated_stress_streak",
    predicate: (d) =>
      d.maxStress != null && d.maxStress >= ELEVATED_STRESS_THRESHOLD_FIVE,
  },
  {
    id: "low_energy_streak",
    predicate: (d) =>
      d.minEnergy != null && d.minEnergy <= LOW_ENERGY_THRESHOLD_FIVE,
  },
];

/**
 * Returns every nudge whose consecutive-day streak meets the threshold (no priority override).
 */
export function detectStudentWellnessNudges(
  logs: StudentWellnessNudgeLogLike[],
  fromDate = new Date(),
): StudentWellnessNudgeCopy[] {
  const dailies = aggregateStudentDays(logs);
  if (dailies.length === 0) return [];

  const results: StudentWellnessNudgeCopy[] = [];
  for (const check of NUDGE_CHECKS) {
    const streak = consecutiveDaysEndingToday(
      dailies,
      check.predicate,
      fromDate,
    );
    if (streak >= WELLNESS_CONSECUTIVE_DAYS_REQUIRED) {
      results.push(wellnessNudgeCopyForId(check.id));
    }
  }
  return results;
}

/**
 * @deprecated Prefer detectStudentWellnessNudges — returns first match only.
 */
export function detectStudentWellnessNudge(
  logs: StudentWellnessNudgeLogLike[],
  fromDate = new Date(),
): StudentWellnessNudgeCopy | null {
  return detectStudentWellnessNudges(logs, fromDate)[0] ?? null;
}
