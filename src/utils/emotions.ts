import type { ManualEmotion } from '../types/mood.types'

/** The 5 core emotions used across the project */
export const MANUAL_EMOTIONS: ManualEmotion[] = [
  { name: 'happy', color: '#FFA900', label: 'Happy', emoji: '😊' },
  { name: 'sad', color: '#086FE6', label: 'Sad', emoji: '😢' },
  { name: 'angry', color: '#F90038', label: 'Angry', emoji: '😡' },
  { name: 'surprise', color: '#FF7105', label: 'Surprise', emoji: '😮' },
  { name: 'neutral', color: '#CAC1C4', label: 'Neutral', emoji: '😐' },
]

/** Hex colors for emotion rendering */
export const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#4169E1',
  angry: '#DC143C',
  surprise: '#FF8C00',
  neutral: '#808080',
  // Legacy aliases for existing Firestore data
  joy: '#FFD700',
  sadness: '#4169E1',
  anger: '#DC143C',
}

/** Tailwind class combos for schedule event types */
export const EVENT_TYPE_COLORS: Record<string, string> = {
  exam: 'bg-red-100 text-red-700 border-red-300',
  deadline: 'bg-orange-100 text-orange-700 border-orange-300',
  meeting: 'bg-blue-100 text-blue-700 border-blue-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
}