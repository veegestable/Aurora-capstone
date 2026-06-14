/**
 * Counselor roster pattern indicators — non-clinical self-report patterns.
 * Multiple check-ins per day: elevated stress uses the day's max stress;
 * low energy uses the day's min energy (so distinct same-day logs both count).
 */

import { calendarDayKeyLocal } from "../utils/dayKey";

export const ELEVATED_STRESS_THRESHOLD_FIVE = 4;
export const LOW_ENERGY_THRESHOLD_FIVE = 2;
export const PATTERN_MIN_MATCHING_DAYS = 3;
export const PATTERN_LAST_N_LOGGED_DAYS = 5;

export type CounselorPatternIndicatorId = "elevated_stress" | "low_energy";

export interface CounselorPatternIndicator {
  id: CounselorPatternIndicatorId;
  label: string;
}

export interface CounselorPatternLogLike {
  log_date?: Date | string;
  dayKey?: string;
  stress_level?: number;
  energy_level?: number;
  stress?: number;
  energy?: number;
}

function parseLogDate(log: CounselorPatternLogLike): Date | null {
  if (log.log_date instanceof Date) return log.log_date;
  if (typeof log.log_date === "string") {
    const d = new Date(log.log_date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function dayKeyFromLog(log: CounselorPatternLogLike): string | null {
  if (typeof log.dayKey === "string" && log.dayKey.trim()) {
    return log.dayKey.trim();
  }
  const d = parseLogDate(log);
  return d ? calendarDayKeyLocal(d) : null;
}

/** Normalize stored stress to 1–5 (handles 1–10 merged logs). */
export function stressLevelToFive(v: number | undefined | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v <= 5) return Math.min(5, Math.max(1, v));
  return Math.min(5, Math.max(1, Math.round(v / 2)));
}

/** Normalize stored energy to 1–5 (handles 1–10 merged logs). */
export function energyLevelToFive(v: number | undefined | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v <= 5) return Math.min(5, Math.max(1, v));
  return Math.min(5, Math.max(1, Math.round(v / 2)));
}

function stressFromLog(log: CounselorPatternLogLike): number | null {
  return stressLevelToFive(log.stress ?? log.stress_level);
}

function energyFromLog(log: CounselorPatternLogLike): number | null {
  return energyLevelToFive(log.energy ?? log.energy_level);
}

interface DailyAggregate {
  dayKey: string;
  /** Highest stress self-report that day (any check-in). */
  maxStress: number;
  /** Lowest energy self-report that day (any check-in). */
  minEnergy: number;
}

function aggregateByDay(logs: CounselorPatternLogLike[]): DailyAggregate[] {
  const byDay = new Map<
    string,
    { maxStress: number; minEnergy: number; hasStress: boolean; hasEnergy: boolean }
  >();
  for (const log of logs) {
    const key = dayKeyFromLog(log);
    const stress = stressFromLog(log);
    const energy = energyFromLog(log);
    if (!key) continue;
    const entry = byDay.get(key) ?? {
      maxStress: 1,
      minEnergy: 5,
      hasStress: false,
      hasEnergy: false,
    };
    if (stress != null) {
      entry.maxStress = entry.hasStress
        ? Math.max(entry.maxStress, stress)
        : stress;
      entry.hasStress = true;
    }
    if (energy != null) {
      entry.minEnergy = entry.hasEnergy
        ? Math.min(entry.minEnergy, energy)
        : energy;
      entry.hasEnergy = true;
    }
    if (entry.hasStress || entry.hasEnergy) {
      byDay.set(key, entry);
    }
  }
  return [...byDay.entries()]
    .filter(([, v]) => v.hasStress || v.hasEnergy)
    .map(([dayKey, v]) => ({
      dayKey,
      maxStress: v.hasStress ? v.maxStress : 1,
      minEnergy: v.hasEnergy ? v.minEnergy : 5,
    }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

function isNextCalendarDay(prevKey: string, nextKey: string): boolean {
  const prev = new Date(`${prevKey}T12:00:00`);
  const next = new Date(`${nextKey}T12:00:00`);
  if (Number.isNaN(prev.getTime()) || Number.isNaN(next.getTime())) return false;
  const diffDays = Math.round((next.getTime() - prev.getTime()) / 86400000);
  return diffDays === 1;
}

function longestConsecutiveDaysMatching(
  dailies: DailyAggregate[],
  predicate: (d: DailyAggregate) => boolean,
): number {
  const keys = dailies
    .filter(predicate)
    .map((d) => d.dayKey)
    .sort();
  if (keys.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < keys.length; i++) {
    if (isNextCalendarDay(keys[i - 1], keys[i])) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

function countInLastNLoggedDays(
  dailies: DailyAggregate[],
  n: number,
  predicate: (d: DailyAggregate) => boolean,
): number {
  return dailies.slice(0, n).filter(predicate).length;
}

/**
 * Derive roster pattern badges from raw check-in logs (before journal sanitization).
 */
export function computeCounselorPatternIndicators(
  logs: CounselorPatternLogLike[],
): CounselorPatternIndicator[] {
  const dailies = aggregateByDay(logs);
  if (dailies.length === 0) return [];

  const indicators: CounselorPatternIndicator[] = [];

  const elevatedDaysLast5 = countInLastNLoggedDays(
    dailies,
    PATTERN_LAST_N_LOGGED_DAYS,
    (d) => d.maxStress >= ELEVATED_STRESS_THRESHOLD_FIVE,
  );
  const elevatedConsecutive = longestConsecutiveDaysMatching(
    dailies,
    (d) => d.maxStress >= ELEVATED_STRESS_THRESHOLD_FIVE,
  );

  if (
    elevatedDaysLast5 >= PATTERN_MIN_MATCHING_DAYS ||
    elevatedConsecutive >= PATTERN_MIN_MATCHING_DAYS
  ) {
    indicators.push({
      id: "elevated_stress",
      label: "Elevated stress",
    });
  }

  const lowEnergyDaysLast5 = countInLastNLoggedDays(
    dailies,
    PATTERN_LAST_N_LOGGED_DAYS,
    (d) => d.minEnergy <= LOW_ENERGY_THRESHOLD_FIVE,
  );

  if (lowEnergyDaysLast5 >= PATTERN_MIN_MATCHING_DAYS) {
    indicators.push({
      id: "low_energy",
      label: "Low energy",
    });
  }

  return indicators;
}

export function hasCounselorPatternIndicators(
  indicators: CounselorPatternIndicator[],
): boolean {
  return indicators.length > 0;
}

export function counselorPatternSortKey(
  indicators: CounselorPatternIndicator[],
): number {
  return indicators.length > 0 ? 0 : 1;
}

export function getCounselorPatternIndicatorStyle(
  id: CounselorPatternIndicatorId,
): { badgeBg: string; text: string; border: string } {
  switch (id) {
    case "elevated_stress":
      return {
        badgeBg: "rgba(249,115,22,0.15)",
        text: "#FB923C",
        border: "rgba(249,115,22,0.35)",
      };
    case "low_energy":
      return {
        badgeBg: "rgba(148,163,184,0.15)",
        text: "#94A3B8",
        border: "rgba(148,163,184,0.35)",
      };
  }
}
