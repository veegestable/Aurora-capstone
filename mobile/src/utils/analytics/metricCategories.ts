/**
 * Plain-language buckets for 1–5 analytics scales (matches student Analytics copy).
 */

export function stressCategoryFromFive(avg: number | null): string {
    if (avg == null) return 'not enough stress data';
    if (avg <= 1.8) return 'very calm';
    if (avg <= 2.6) return 'normal';
    if (avg <= 3.5) return 'stressed';
    return 'very stressed';
}

export function energyCategoryFromFive(avg: number | null): string {
    if (avg == null) return 'not enough energy data';
    if (avg <= 1.8) return 'very low';
    if (avg <= 2.6) return 'low';
    if (avg <= 3.5) return 'steady';
    return 'high';
}

/** Overall mood quality from a 1–5 average (e.g. intensity mapped to five). */
export function moodCategoryFromFive(avg: number | null): string {
    if (avg == null) return 'not enough mood data';
    if (avg >= 4.2) return 'mostly good';
    if (avg >= 3.4) return 'mostly okay';
    if (avg >= 2.6) return 'mixed with lower moments';
    return 'mostly low';
}

export function sentenceCase(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
