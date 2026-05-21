import { EMOTION_COLORS } from './emotions'

const EMOTION_LABELS = {
  joy: 'Happy',
  surprise: 'Surprise',
  anger: 'Angry',
  sadness: 'Sad',
  neutral: 'Neutral',
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
} as const

const EMOTION_ALIASES: Record<string, keyof typeof EMOTION_LABELS> = {
  joy: 'joy',
  happiness: 'joy',
  happy: 'joy',
  surprise: 'surprise',
  surprised: 'surprise',
  anger: 'anger',
  angry: 'anger',
  sadness: 'sadness',
  sad: 'sadness',
  neutral: 'neutral',
}

/** Single bucket per Aurora mood family (mobile parity). */
export function canonicalMoodKey(raw: string): string {
  const key =
    String(raw || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .trim() || 'neutral'
  const mapped = EMOTION_ALIASES[key]
  if (mapped) return mapped
  if (key in EMOTION_LABELS) return key
  return key
}

export function getEmotionColor(emotion: string): string {
  const key = canonicalMoodKey(emotion)
  const mapped = EMOTION_ALIASES[key]
  if (mapped) return EMOTION_COLORS[mapped] ?? EMOTION_COLORS.neutral
  if (key in EMOTION_COLORS) return EMOTION_COLORS[key]
  return EMOTION_COLORS.neutral
}

export function getEmotionLabel(emotion: string): string {
  const raw = (emotion || '').trim()
  if (!raw || raw === '—' || raw === '-') return raw
  const key = canonicalMoodKey(raw)
  const mapped = EMOTION_ALIASES[key]
  if (mapped) return EMOTION_LABELS[mapped]
  if (key in EMOTION_LABELS) return EMOTION_LABELS[key as keyof typeof EMOTION_LABELS]
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// Internal helper for blending colors (no longer exported)
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function getBlendedColorWeighted(
  emotions: Array<{ color: string; confidence: number }>
): string {
  if (emotions.length === 0) return '#f3f4f6'
  if (emotions.length === 1) return emotions[0].color

  let totalWeight = 0
  let r = 0, g = 0, b = 0

  emotions.forEach(({ color, confidence }) => {
    const rgb = hexToRgb(color)
    if (rgb) {
      r += rgb.r * confidence
      g += rgb.g * confidence
      b += rgb.b * confidence
      totalWeight += confidence
    }
  })

  if (totalWeight === 0) return '#f3f4f6'
  r = Math.round(r / totalWeight)
  g = Math.round(g / totalWeight)
  b = Math.round(b / totalWeight)

  return `rgb(${r}, ${g}, ${b})`
}

export function getBlendedColorWithAlpha(
  emotions: Array<{ color: string; confidence: number }>,
  alpha: number
): string {
  if (emotions.length === 0) return `rgba(243, 244, 246, ${alpha})`
  const color = getBlendedColorWeighted(emotions)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const hexColor = hexToRgb(color)
  if (hexColor) {
    return `rgba(${hexColor.r}, ${hexColor.g}, ${hexColor.b}, ${alpha})`
  }
  return `rgba(243, 244, 246, ${alpha})`
}

export function getColorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`
    }
  }
  const rgb = hexToRgb(color)
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
  }
  return color
}
