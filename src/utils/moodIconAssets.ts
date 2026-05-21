import { canonicalMoodKey } from './moodColors'

const MOOD_ICON_BY_CANONICAL: Record<
  'joy' | 'sadness' | 'anger' | 'surprise' | 'neutral',
  string
> = {
  joy: '/images/moodIcon/happy.png',
  sadness: '/images/moodIcon/sad.png',
  anger: '/images/moodIcon/angry.png',
  surprise: '/images/moodIcon/surprise.png',
  neutral: '/images/moodIcon/neutral.png',
}

/** PNG path for Aurora's five mood families (mobile `getMoodIconSource` parity). */
export function getMoodIconUrl(raw: string): string {
  const key = canonicalMoodKey(raw)
  if (key in MOOD_ICON_BY_CANONICAL) {
    return MOOD_ICON_BY_CANONICAL[key as keyof typeof MOOD_ICON_BY_CANONICAL]
  }
  return MOOD_ICON_BY_CANONICAL.neutral
}
