export type MoodType = 'happy' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'stressed';

export interface MoodDraft {
    mood: MoodType | null;
    intensity: number;
    note: string;
}
