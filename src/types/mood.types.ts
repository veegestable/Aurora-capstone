// Shared emotion detection result used by MoodCheckIn & EmotionDetection
export interface DetectedEmotion {
  emotion: string
  confidence: number
  color: string
}

// Single item in the manual emotion picker
export interface ManualEmotion {
  name: string
  color: string
  label: string
  emoji: string
}

// Props for the MoodCheckIn component
export interface MoodCheckInProps {
  onMoodLogged?: () => void
  onBackgroundChange?: (background: string | undefined) => void
}