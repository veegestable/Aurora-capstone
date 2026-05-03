/**
 * Mood frequency / duration / intensity aggregates — shared by student Analytics
 * and counselor “last 7 days” mirrors (same formulas as student today charts,
 * scoped to an arbitrary log list).
 */

import type { MoodData } from "../../services/firebase-firestore.service";
import { getEmotionColor, getEmotionLabel } from "../moodColors";

export type MoodChartAggregate = {
  mood: string;
  label: string;
  color: string;
  count: number;
  totalMinutes: number;
  averageIntensity: number;
  intensitySamples: number;
};

type MoodEpisode = { startMs: number; endMs: number };

function getMoodFromLog(
  log: MoodData & { mood?: string; emotions?: Array<{ emotion?: string }> },
): string {
  const raw = log.mood || log.emotions?.[0]?.emotion || "neutral";
  return String(raw).toLowerCase().trim() || "neutral";
}

function getIntensityFromLog(log: MoodData): number | null {
  const raw = typeof log.intensity === "number" ? log.intensity : null;
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

function getDurationMinutesFromLog(log: MoodData): number | null {
  const raw =
    typeof log.duration_in_minutes === "number" ? log.duration_in_minutes : null;
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.max(1, Math.min(1440, Math.round(raw)));
}

function localDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function mergeEpisodes(episodes: MoodEpisode[]): MoodEpisode[] {
  if (episodes.length <= 1) return episodes;
  const sorted = [...episodes].sort((a, b) => a.startMs - b.startMs);
  const merged: MoodEpisode[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = merged[merged.length - 1];
    if (current.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, current.endMs);
      continue;
    }
    merged.push({ ...current });
  }
  return merged;
}

/**
 * Aggregate mood charts from logs, clipping duration episodes to each log’s calendar day
 * (same rule as student “today” charts).
 */
export function buildMoodChartAggregatesFromLogs(
  logs: Array<MoodData & { log_date: Date }>,
): {
  byMood: MoodChartAggregate[];
  totalCheckIns: number;
} {
  if (!logs.length) {
    return { byMood: [], totalCheckIns: 0 };
  }

  const moodCount = new Map<string, number>();
  const moodIntensity = new Map<string, { sum: number; n: number }>();
  const moodEpisodes = new Map<string, MoodEpisode[]>();

  for (const log of logs) {
    const moodKey = getMoodFromLog(log);
    moodCount.set(moodKey, (moodCount.get(moodKey) ?? 0) + 1);

    const intensity = getIntensityFromLog(log);
    if (intensity != null) {
      const prev = moodIntensity.get(moodKey) ?? { sum: 0, n: 0 };
      moodIntensity.set(moodKey, { sum: prev.sum + intensity, n: prev.n + 1 });
    }

    const minutes = getDurationMinutesFromLog(log);
    if (minutes != null) {
      const logDate =
        log.log_date instanceof Date ? log.log_date : new Date(log.log_date);
      const { start: dayStart, end: dayEnd } = localDayBounds(logDate);
      const dayStartMs = dayStart.getTime();
      const dayEndMs = dayEnd.getTime();
      const endMs = logDate.getTime();
      const startMs = endMs - minutes * 60 * 1000;
      const clippedStart = Math.max(startMs, dayStartMs);
      const clippedEnd = Math.min(endMs, dayEndMs);
      if (clippedEnd > clippedStart) {
        const list = moodEpisodes.get(moodKey) ?? [];
        list.push({ startMs: clippedStart, endMs: clippedEnd });
        moodEpisodes.set(moodKey, list);
      }
    }
  }

  const moodKeys = Array.from(
    new Set([
      ...moodCount.keys(),
      ...moodIntensity.keys(),
      ...moodEpisodes.keys(),
    ]),
  );

  const byMood = moodKeys
    .map((mood) => {
      const episodes = mergeEpisodes(moodEpisodes.get(mood) ?? []);
      const totalMinutes = episodes.reduce(
        (sum, e) => sum + Math.max(0, Math.round((e.endMs - e.startMs) / 60000)),
        0,
      );
      const intensityStats = moodIntensity.get(mood) ?? { sum: 0, n: 0 };
      const averageIntensity =
        intensityStats.n > 0 ? intensityStats.sum / intensityStats.n : 0;
      return {
        mood,
        label: getEmotionLabel(mood),
        color: getEmotionColor(mood),
        count: moodCount.get(mood) ?? 0,
        totalMinutes,
        averageIntensity,
        intensitySamples: intensityStats.n,
      };
    })
    .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);

  return {
    byMood,
    totalCheckIns: logs.length,
  };
}
