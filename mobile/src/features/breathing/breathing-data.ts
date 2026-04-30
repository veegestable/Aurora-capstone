import { AURORA } from "../../constants/aurora-colors";

export type BreathPhaseType = "inhale" | "hold" | "exhale";

export type BreathPhase = {
  id: string;
  label: string;
  instruction: string;
  seconds: number;
  type: BreathPhaseType;
};

export type BreathingExercise = {
  id: string;
  name: string;
  description: string;
  primaryMoodTargets: string[];
  soundscapeName: string;
  soundscapeAsset: number;
  soundscapeVolume?: number;
  soundscapeUrl: string;
  soundscapeSourceLabel: string;
  phases: BreathPhase[];
};

export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Square and rhythmic breathing to settle anxious or surprised states.",
    primaryMoodTargets: ["surprise", "anxiety"],
    soundscapeName: "Calm Synth / Deep Space",
    soundscapeAsset: require("../../assets/sounds/breathing/Box_Breathing.mp3"),
    soundscapeVolume: 0.4,
    soundscapeUrl: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6ff1d20.mp3",
    soundscapeSourceLabel: "ElevenLabs Ambient reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Breathe in through your nose", seconds: 4, type: "inhale" },
      { id: "hold-in", label: "Hold", instruction: "Hold gently", seconds: 4, type: "hold" },
      { id: "out", label: "Exhale", instruction: "Slow exhale through your mouth", seconds: 4, type: "exhale" },
      { id: "hold-out", label: "Hold", instruction: "Rest before next inhale", seconds: 4, type: "hold" },
    ],
  },
  {
    id: "478",
    name: "4-7-8 Relax",
    description: "A deep calming cadence to down-regulate stress and anger.",
    primaryMoodTargets: ["stress", "anger"],
    soundscapeName: "Brown Noise / Heavy Rain",
    soundscapeAsset: require("../../assets/sounds/breathing/4-7-8 Relax.mp3"),
    soundscapeVolume: 0.42,
    soundscapeUrl: "https://cdn.pixabay.com/audio/2022/06/08/audio_1f6d3a8f78.mp3",
    soundscapeSourceLabel: "Mixkit Rain reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Slow inhale through your nose", seconds: 4, type: "inhale" },
      { id: "hold-in", label: "Hold", instruction: "Hold and stay relaxed", seconds: 7, type: "hold" },
      { id: "out", label: "Exhale", instruction: "Long exhale through your mouth", seconds: 8, type: "exhale" },
    ],
  },
  {
    id: "coherent",
    name: "Coherent Breathing",
    description: "Balanced pace to steady your system and heart rhythm.",
    primaryMoodTargets: ["neutral", "calm"],
    soundscapeName: "Alpha Binaural Beats",
    soundscapeAsset: require("../../assets/sounds/breathing/Coherent.mp3"),
    soundscapeVolume: 0.4,
    soundscapeUrl: "https://cdn.pixabay.com/audio/2023/05/05/audio_56f0f72359.mp3",
    soundscapeSourceLabel: "Uppbeat Binaural reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Breathe in smoothly", seconds: 5.5, type: "inhale" },
      { id: "out", label: "Exhale", instruction: "Exhale smoothly", seconds: 5.5, type: "exhale" },
    ],
  },
  {
    id: "bellows",
    name: "Bellows (Power)",
    description: "Fast and energizing breathing to boost low energy.",
    primaryMoodTargets: ["sadness", "fatigue"],
    soundscapeName: "Uplifting Lo-Fi / Stream",
    soundscapeAsset: require("../../assets/sounds/breathing/Bellows (Power).mp3"),
    soundscapeVolume: 0.44,
    soundscapeUrl: "https://cdn.pixabay.com/audio/2022/03/24/audio_2a191e3f5f.mp3",
    soundscapeSourceLabel: "Mondo Loops reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Quick inhale", seconds: 1, type: "inhale" },
      { id: "out", label: "Exhale", instruction: "Quick exhale", seconds: 1, type: "exhale" },
    ],
  },
  {
    id: "physiological-sigh",
    name: "Physiological Sigh",
    description: "Double inhale then long exhale for immediate tension release.",
    primaryMoodTargets: ["overwhelmed"],
    soundscapeName: "Ocean Waves / White Noise",
    soundscapeAsset: require("../../assets/sounds/breathing/Physiological Sigh.mp3"),
    soundscapeVolume: 0.14,
    soundscapeUrl: "https://cdn.pixabay.com/audio/2022/07/04/audio_4201f9f7f1.mp3",
    soundscapeSourceLabel: "Mixkit Ocean reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Deep inhale", seconds: 4, type: "inhale" },
      { id: "in-sharp", label: "Top-up Inhale", instruction: "Short extra inhale", seconds: 1, type: "inhale" },
      { id: "out", label: "Exhale", instruction: "Long relieving exhale", seconds: 8, type: "exhale" },
    ],
  },
];

export const DURATION_OPTIONS_MINUTES = [1, 3, 5] as const;
export type DurationOptionMinutes = (typeof DURATION_OPTIONS_MINUTES)[number];

export const MOOD_COLOR_MAP: Record<string, string> = {
  joy: AURORA.moodHappy,
  sadness: AURORA.moodSad,
  anger: AURORA.moodAngry,
  surprise: AURORA.moodSurprise,
  neutral: AURORA.moodNeutral,
};

export function getBreathingExerciseForMood(params: {
  mood?: string | null;
  stressLevel?: number;
  energyLevel?: number;
}): BreathingExercise {
  const mood = params.mood?.toLowerCase();
  const stress = params.stressLevel ?? 3;
  const energy = params.energyLevel ?? 3;

  if (stress >= 5) return BREATHING_EXERCISES.find((x) => x.id === "physiological-sigh")!;
  if (mood === "anger" || stress >= 4) return BREATHING_EXERCISES.find((x) => x.id === "478")!;
  if (mood === "sadness" || energy <= 2) return BREATHING_EXERCISES.find((x) => x.id === "bellows")!;
  if (mood === "surprise") return BREATHING_EXERCISES.find((x) => x.id === "box")!;
  if (mood === "neutral") return BREATHING_EXERCISES.find((x) => x.id === "coherent")!;
  return BREATHING_EXERCISES.find((x) => x.id === "box")!;
}

export function getMoodColor(mood?: string | null): string {
  return MOOD_COLOR_MAP[mood?.toLowerCase() ?? ""] ?? AURORA.blue;
}

export function getPhaseCycleDurationSeconds(exercise: BreathingExercise): number {
  return exercise.phases.reduce((sum, phase) => sum + phase.seconds, 0);
}

export function getCycleCountForDuration(exercise: BreathingExercise, durationSeconds: number): number {
  const cycleSeconds = Math.max(1, getPhaseCycleDurationSeconds(exercise));
  return Math.max(1, Math.ceil(durationSeconds / cycleSeconds));
}
