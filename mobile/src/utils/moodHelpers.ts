import { MoodType } from '../types/mood.types';

export function isNegativeMood(mood: MoodType): boolean {
    return ['sad', 'anxious', 'angry', 'stressed'].includes(mood);
}
