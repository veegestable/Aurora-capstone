export const AURORA = {
    // Backgrounds
    bg: '#0B0D30',
    bgDeep: '#080B25',
    bgMessages: '#080C2A',
    bgResources: '#120B2E',
    // Cards
    card: '#10143C',
    cardAlt: '#0D1238',
    cardDark: '#0A0C28',
    // Navigation
    navBg: '#070A2E',
    // Accents
    blue: '#2D6BFF',
    blueLight: '#4D8BFF',
    purple: '#7C3AED',
    purpleDeep: '#4A00E0',
    purpleBright: '#8B2CF5',
    green: '#22C55E',
    amber: '#FEBD03',
    red: '#EF4444',
    orange: '#F97316',
    // Text
    textPrimary: '#FFFFFF',
    textSec: '#7B8EC8',
    textMuted: '#4B5693',
    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',
    // Mood colors (matching Aurora design)
    moodHappy: '#FEBD03',
    moodSad: '#086FE6',
    moodNeutral: '#94A3B8',
    moodSurprise: '#FF7105',
    moodAngry: '#F90038',
} as const;

export const AURORA_MOOD_COLORS: Record<string, string> = {
    joy: '#FEBD03',
    happy: '#FEBD03',
    sadness: '#086FE6',
    sad: '#086FE6',
    anger: '#F90038',
    angry: '#F90038',
    surprise: '#FF7105',
    neutral: '#94A3B8',
};
