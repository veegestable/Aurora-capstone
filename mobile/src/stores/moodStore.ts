import { create } from 'zustand';
import { MoodType } from '../types/mood.types';

interface MoodStoreState {
    draftMood: MoodType | null;
    draftIntensity: number;
    draftNote: string;
    setDraftMood: (mood: MoodType) => void;
    setDraftIntensity: (intensity: number) => void;
    setDraftNote: (note: string) => void;
    clearDraft: () => void;
}

const DEFAULT_INTENSITY = 3;

export const useMoodStore = create<MoodStoreState>((set) => ({
    draftMood: null,
    draftIntensity: DEFAULT_INTENSITY,
    draftNote: '',
    setDraftMood: (mood) => set({ draftMood: mood }),
    setDraftIntensity: (intensity) => set({ draftIntensity: intensity }),
    setDraftNote: (note) => set({ draftNote: note }),
    clearDraft: () => set({ draftMood: null, draftIntensity: DEFAULT_INTENSITY, draftNote: '' }),
}));
