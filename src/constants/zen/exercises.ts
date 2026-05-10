export type BreathPhaseType = "inhale" | "hold" | "exhale"

export interface BreathPhase {
  id: string
  label: string
  instruction: string
  seconds: number
  type: BreathPhaseType
}

export interface BreathingExerciseData {
  id: string
  name: string
  description: string
  primaryMoodTargets: string[]
  soundscapeName: string
  soundscapeUrl: string
  soundscapeVolume?: number
  soundscapeSourceLabel: string
  phases: BreathPhase[]
}

export const BREATHING_EXERCISES: BreathingExerciseData[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Square and rhythmic breathing to settle anxious or surprised states.",
    primaryMoodTargets: ["surprise", "anxiety"],
    soundscapeName: "Calm Synth / Deep Space",
    soundscapeUrl: "/sounds/breathing/box-breathing.mp3",
    soundscapeVolume: 0.4,
    soundscapeSourceLabel: "Breathing app reference",
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
    soundscapeUrl: "/sounds/breathing/4-7-8-relax.mp3",
    soundscapeVolume: 0.42,
    soundscapeSourceLabel: "Breathing app reference",
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
    soundscapeUrl: "/sounds/breathing/coherent.mp3",
    soundscapeVolume: 0.4,
    soundscapeSourceLabel: "Breathing app reference",
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
    soundscapeUrl: "/sounds/breathing/bellows-power.mp3",
    soundscapeVolume: 0.44,
    soundscapeSourceLabel: "Breathing app reference",
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
    soundscapeUrl: "/sounds/breathing/physiological-sigh.mp3",
    soundscapeVolume: 0.14,
    soundscapeSourceLabel: "Breathing app reference",
    phases: [
      { id: "in", label: "Inhale", instruction: "Deep inhale", seconds: 4, type: "inhale" },
      { id: "in-sharp", label: "Top-up Inhale", instruction: "Short extra inhale", seconds: 1, type: "inhale" },
      { id: "out", label: "Exhale", instruction: "Long relieving exhale", seconds: 8, type: "exhale" },
    ],
  },
]

export const DURATION_OPTIONS_MINUTES = [1, 3, 5] as const
export type DurationOptionMinutes = (typeof DURATION_OPTIONS_MINUTES)[number]

export function getPhaseCycleDurationSeconds(exercise: BreathingExerciseData): number {
  return exercise.phases.reduce((sum, phase) => sum + phase.seconds, 0)
}

export function getCycleCountForDuration(
  exercise: BreathingExerciseData, 
  durationSeconds: number
): number {
  const cycleSeconds = Math.max(1, getPhaseCycleDurationSeconds(exercise))
  return Math.max(1, Math.ceil(durationSeconds / cycleSeconds))
}