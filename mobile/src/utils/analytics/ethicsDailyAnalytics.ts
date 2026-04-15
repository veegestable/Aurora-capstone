/**
 * AURORA — Daily analytics (deterministic, non-clinical)
 *
 * Stress combines self-reported mood scale (1–5) and task load. No AI.
 * Do not use output for diagnosis or prediction.
 */

export type StressBand = 'Low' | 'Moderate' | 'High';

/** Maps app energy slider (1–10) to analytics mood scale (1–5). */
export function energyLevelToMoodScale(energy: number): number {
    const e = Number(energy);
    if (!Number.isFinite(e)) return 3;
    return Math.min(5, Math.max(1, Math.ceil(e / 2)));
}

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

export function taskCountFromLog(log: { event_tags?: string[] }): number {
    const tags = Array.isArray(log.event_tags) ? log.event_tags : [];
    return tags.filter((tag) => SCHOOL_EVENT_TAGS.has(tag)).length;
}

export function calculateStressLevel(mood: number, tasks: number): number {
    const moodStress = (5 - mood) / 4;
    const taskStress = Math.min(tasks / 10, 1);
    return moodStress * 0.6 + taskStress * 0.4;
}

export function classifyStress(score: number): StressBand {
    if (score >= 0.75) return 'High';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
}

/** Descriptive label for mood scale — not a clinical assessment. */
export function classifyMood(mood: number): string {
    if (mood >= 4) return 'Positive';
    if (mood === 3) return 'Neutral';
    return 'Low';
}

/**
 * Short prescriptive copy (habits / pacing only). Requires valid mood 1–5.
 * If mood is missing or invalid, callers should show "No data available" instead.
 */
export function getDailyFeedback(stress: StressBand | string, mood: number): string {
    if (stress === 'High') {
        return 'You may have had a heavy day. Consider taking short breaks and organizing your tasks into smaller steps.';
    }
    if (stress === 'Moderate') {
        return "You're managing your day fairly well. Keep a steady pace and take time to rest when needed.";
    }
    if (stress === 'Low' && mood >= 4) {
        return 'You seem to be doing well today. Keep up your current routine.';
    }
    return 'Keep tracking your mood regularly to better understand your daily patterns.';
}

/** When mood cannot be computed, do not infer stress or causes. */
export function getDailyFeedbackOrNoData(mood: number | undefined | null, tasks: number): string {
    if (mood == null || Number.isNaN(mood) || mood < 1 || mood > 5) {
        return 'No data available';
    }
    const score = calculateStressLevel(mood, Math.max(0, tasks));
    const band = classifyStress(score);
    return getDailyFeedback(band, mood);
}
