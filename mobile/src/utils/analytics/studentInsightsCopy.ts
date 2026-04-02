/**
 * Plain-language copy for student Insights — consistent terms:
 * - Mood = 1–5 from check-in
 * - Stress Index = 0–100 computed score (not medical)
 */

import type { StressBand } from './ethicsDailyAnalytics';
import type { DayStress } from './weeklySeries';

export function stressScoreToIndex(score: number): number {
    const s = Math.min(1, Math.max(0, score));
    return Math.round(s * 100);
}

/** How the typical Stress Index band felt this week (student words). */
export function stressBandPlain(band: StressBand | 'None' | '—'): string {
    switch (band) {
        case 'Low':
            return 'lower Stress Index';
        case 'Moderate':
            return 'middle Stress Index';
        case 'High':
            return 'higher Stress Index';
        default:
            return 'not enough check-ins yet';
    }
}

export function averageMoodPlainLine(avg: number | null): string {
    if (avg == null) return 'Check in a few times this week to see this.';
    if (avg >= 4.2) return 'Your mood on logged days was mostly good.';
    if (avg >= 3.4) return 'Your mood on logged days was mostly okay.';
    if (avg >= 2.6) return 'Some logged days had lower mood.';
    return 'Several logged days had low mood.';
}

/** Rewrites old AI/raw phrasing into student-friendly lines (safety net for cached responses). */
export function polishStudentBullet(text: string): string {
    const t = text.trim();
    if (/^total logged tasks across the week:\s*0\.?$/i.test(t)) {
        return 'No tasks were listed on your check-ins this week.';
    }
    const taskMatch = t.match(/^total logged tasks across the week:\s*(\d+)\.?$/i);
    if (taskMatch) {
        const n = parseInt(taskMatch[1], 10);
        return `You listed ${n} task${n === 1 ? '' : 's'} across your check-ins this week.`;
    }
    if (/dominant stress band in recorded days:\s*low\.?$/i.test(t)) {
        return 'Most of your logged days looked calmer on the Stress Index.';
    }
    if (/dominant stress band in recorded days:\s*moderate\.?$/i.test(t)) {
        return 'Most logged days sat in the middle on the Stress Index.';
    }
    if (/dominant stress band in recorded days:\s*high\.?$/i.test(t)) {
        return 'Several logged days showed a higher Stress Index.';
    }
    return text;
}

export function dominantStressPlain(band: DayStress | '—'): string {
    if (band === '—' || band === 'None') return 'We need more check-ins to describe the week.';
    if (band === 'Low') return 'Most of your days showed a lower Stress Index this week.';
    if (band === 'Moderate') return 'Most of your days sat in the middle on the Stress Index.';
    return 'Several days showed a higher Stress Index this week.';
}
