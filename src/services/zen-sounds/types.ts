export type SoundCategory = 'meditation' | 'focus' | 'sleep'

export interface Track {
  id: string
  title: string
  category: SoundCategory
  url: string
}

export const ZEN_TRACKS: Track[] = [
  {
    id: "med-1",
    title: "Deep Meditation",
    category: "meditation",
    url: "/sounds/meditation.mp3"
  },
  {
    id: "foc-1",
    title: "Flow State",
    category: "focus",
    url: "/sounds/focus.mp3"
  },
  {
    id: "slp-1",
    title: "Gentle Rain",
    category: "sleep",
    url: "/sounds/sleep.mp3"
  }
]

export const TITLE_OVERRIDES: Record<string, Track> = {
  '5-Minute Calm': { id: "ovr-1", title: "5-Minute Calm", category: "meditation", url: "/sounds/calm-5min.mp3" },
  'Stress Release Scan': { id: "ovr-2", title: "Stress Release", category: "meditation", url: "/sounds/stress-release.mp3" },
  'Morning Focus': { id: "ovr-3", title: "Morning Focus", category: "focus", url: "/sounds/morning-focus.mp3" }
}