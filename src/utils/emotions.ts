import type { ManualEmotion } from '../types/mood.types'

/** Colors for manual mood selection (used in MoodCheckIn) */
export const MANUAL_EMOTIONS: ManualEmotion[] = [
  { name: 'joy', color: '#FFA900', label: 'Joy', emoji: '😊' },
  { name: 'love', color: '#FF55B8', label: 'Love', emoji: '🥰' },
  { name: 'surprise', color: '#FF7105', label: 'Surprise', emoji: '😮' },
  { name: 'anger', color: '#F90038', label: 'Anger', emoji: '😡' },
  { name: 'fear', color: '#920FFE', label: 'Fear', emoji: '😰' },
  { name: 'sadness', color: '#086FE6', label: 'Sadness', emoji: '😢' },
  { name: 'disgust', color: '#19BF20', label: 'Disgust', emoji: '🤢' },
  { name: 'neutral', color: '#CAC1C4', label: 'Neutral', emoji: '😐' },
]

/** Hex colors for AI-detected emotions (used in EmotionDetection) */
export const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFD700',
  love: '#FF69B4',
  surprise: '#FF8C00',
  anger: '#DC143C',
  fear: '#8A2BE2',
  sadness: '#4169E1',
  disgust: '#32CD32',
  neutral: '#808080',
}

/** Tailwind class combos for schedule event types */
export const EVENT_TYPE_COLORS: Record<string, string> = {
  exam: 'bg-red-100 text-red-700 border-red-300',
  deadline: 'bg-orange-100 text-orange-700 border-orange-300',
  meeting: 'bg-blue-100 text-blue-700 border-blue-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
}