export type MoodIconName = 'happy' | 'sad' | 'angry' | 'surprise' | 'neutral'

/** Must exist under `public/moodIcon/` */
export const MOOD_ICON_PNG: Record<MoodIconName, string> = {
  happy: '/images/moodIcon/happy.png',
  sad: '/images/moodIcon/sad.png',
  angry: '/images/moodIcon/angry.png',
  surprise: '/images/moodIcon/surprise.png',
  neutral: '/images/moodIcon/neutral.png'
}