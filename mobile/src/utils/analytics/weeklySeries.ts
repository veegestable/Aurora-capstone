/**
 * Build aligned 7-day series for weekly analytics (local calendar days ending today).
 */

import type { MoodData } from '../../services/firebase-firestore.service';
import { calendarDayKeyLocal } from './dateKeys';
import {
    calculateStressLevel,
    classifyStress,
    energyLevelToMoodScale,
    type StressBand,
} from './ethicsDailyAnalytics';

export type DayStress = StressBand | 'None';
const SCHOOL_EVENT_TAGS = new Set([
    'classes',
    'study',
    'quiz',
    'exam',
    'homework',
    'deadline',
    'group-project',
    'presentation',
]);

function schoolSignalCountFromLog(log: { event_tags?: string[] }): number {
    const tags = Array.isArray(log.event_tags) ? log.event_tags : [];
    return tags.filter((tag) => SCHOOL_EVENT_TAGS.has(tag)).length;
}

export interface WeeklySeriesPayload {
    dates: string[];
    daily_mood: number[];
    daily_stress: DayStress[];
    daily_tasks: number[];
}

/** Pick latest log per calendar day (multiple check-ins). */
function latestLogForDay(logs: (MoodData & { log_date: Date })[], dayKey: string): (MoodData & { log_date: Date }) | null {
    const dayLogs = logs.filter((l) => {
        const ld = l.log_date instanceof Date ? l.log_date : new Date(l.log_date);
        return calendarDayKeyLocal(ld) === dayKey;
    });
    if (dayLogs.length === 0) return null;
    return dayLogs.reduce((a, b) => {
        const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date);
        const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date);
        return db.getTime() >= da.getTime() ? b : a;
    });
}

export function buildLast7DaysPayload(
    logs: (MoodData & { log_date: Date })[]
): WeeklySeriesPayload {
    const today = new Date();
    const dates: string[] = [];
    const daily_mood: number[] = [];
    const daily_stress: DayStress[] = [];
    const daily_tasks: number[] = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = calendarDayKeyLocal(d);
        dates.push(key);
        const log = latestLogForDay(logs, key);
        if (!log) {
            daily_mood.push(-1);
            daily_stress.push('None');
            daily_tasks.push(0);
            continue;
        }
        const mood = energyLevelToMoodScale(log.energy_level ?? 5);
        const tasks = schoolSignalCountFromLog(log);
        const stressScore = calculateStressLevel(mood, tasks);
        daily_mood.push(mood);
        daily_stress.push(classifyStress(stressScore));
        daily_tasks.push(tasks);
    }

    return { dates, daily_mood, daily_stress, daily_tasks };
}

/** Descriptive aggregates for summary cards (no causal language). */
export function summarizeWeekSeries(payload: WeeklySeriesPayload): {
    avgMood: number | null;
    avgStressScore: number | null;
    dominantStress: DayStress | '—';
    totalTasks: number;
} {
    const moods = payload.daily_mood.filter((m) => m >= 1 && m <= 5);
    const stressScores: number[] = [];
    for (let i = 0; i < payload.dates.length; i++) {
        const m = payload.daily_mood[i];
        if (m >= 1 && m <= 5) {
            stressScores.push(calculateStressLevel(m, payload.daily_tasks[i]));
        }
    }
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
    const avgStressScore = stressScores.length
        ? stressScores.reduce((a, b) => a + b, 0) / stressScores.length
        : null;

    const bands = payload.daily_stress.filter((s) => s !== 'None') as StressBand[];
    let dominantStress: DayStress | '—' = '—';
    if (bands.length) {
        const counts: Record<string, number> = {};
        for (const b of bands) counts[b] = (counts[b] ?? 0) + 1;
        dominantStress = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as StressBand) ?? '—';
    }

    const totalTasks = payload.daily_tasks.reduce((a, b) => a + b, 0);
    return { avgMood, avgStressScore, dominantStress, totalTasks };
}
