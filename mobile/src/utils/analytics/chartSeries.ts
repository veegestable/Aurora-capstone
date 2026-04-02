/**
 * Descriptive time series for charts — what was logged, not why.
 */

import type { MoodData } from '../../services/firebase-firestore.service';
import { calendarDayKeyLocal } from './dateKeys';
import {
    calculateStressLevel,
    classifyMood,
    energyLevelToMoodScale,
    taskCountFromLog,
} from './ethicsDailyAnalytics';

export interface DailyChartPoint {
    dateKey: string;
    labelShort: string;
    moodScale: number | null;
    stressScore: number | null;
    tasks: number;
}

function latestLogForDay(
    logs: (MoodData & { log_date: Date })[],
    key: string
): (MoodData & { log_date: Date }) | null {
    const dayLogs = logs.filter((l) => {
        const ld = l.log_date instanceof Date ? l.log_date : new Date(l.log_date);
        return calendarDayKeyLocal(ld) === key;
    });
    if (!dayLogs.length) return null;
    return dayLogs.reduce((a, b) => {
        const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date);
        const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date);
        return db.getTime() >= da.getTime() ? b : a;
    });
}

/** Last `numDays` calendar days ending today (one point per day). */
export function buildDailyChartPoints(
    logs: (MoodData & { log_date: Date })[],
    numDays: number
): DailyChartPoint[] {
    const today = new Date();
    const out: DailyChartPoint[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = calendarDayKeyLocal(d);
        const log = latestLogForDay(logs, key);
        /** Never truncate — used in scrollable chart axes (e.g. "Mar 14"). */
        const labelShort = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!log) {
            out.push({ dateKey: key, labelShort, moodScale: null, stressScore: null, tasks: 0 });
            continue;
        }
        const moodScale = energyLevelToMoodScale(log.energy_level ?? 5);
        const tasks = taskCountFromLog(log);
        const stressScore = calculateStressLevel(moodScale, tasks);
        out.push({ dateKey: key, labelShort, moodScale, stressScore, tasks });
    }
    return out;
}

/** Fill color for calendar strip cells (1–5 = energy scale; null = no check-in). */
export function moodStripFillForScale(mood: number | null): string {
    if (mood == null) return 'rgba(75, 86, 147, 0.22)';
    if (mood <= 1) return '#1d4ed8';
    if (mood === 2) return '#3b82f6';
    if (mood === 3) return '#64748b';
    if (mood === 4) return '#4ade80';
    return '#22c55e';
}

export function moodDistributionCounts(points: DailyChartPoint[]): {
    positive: number;
    neutral: number;
    low: number;
} {
    let positive = 0;
    let neutral = 0;
    let low = 0;
    for (const p of points) {
        if (p.moodScale == null) continue;
        const lab = classifyMood(p.moodScale);
        if (lab === 'Positive') positive++;
        else if (lab === 'Neutral') neutral++;
        else low++;
    }
    return { positive, neutral, low };
}
