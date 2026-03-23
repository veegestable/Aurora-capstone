export interface DetectedEmotion {
  emotion: string
  confidence: number
  color: string
}

export interface ManualEmotion {
  name: string
  color: string
  label: string
  emoji: string
}

export interface MoodCheckInProps {
  onMoodLogged?: () => void
  onBackgroundChange?: (background: string | undefined) => void
}