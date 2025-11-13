export const EMOTION_COLORS = {
  joy: '#FFD700',
  love: '#FF69B4',
  surprise: '#FF8C00',
  anger: '#DC143C',
  fear: '#8A2BE2',
  sadness: '#4169E1',
  disgust: '#32CD32',
  neutral: '#808080'
} as const;

export const EMOTION_LABELS = {
  joy: 'Joy',
  love: 'Love',
  surprise: 'Surprise',
  anger: 'Anger',
  fear: 'Fear',
  sadness: 'Sadness',
  disgust: 'Disgust',
  neutral: 'Neutral'
} as const;

export function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || EMOTION_COLORS.neutral;
}

export function getEmotionLabel(emotion: string): string {
  return EMOTION_LABELS[emotion as keyof typeof EMOTION_LABELS] || emotion;
}

export function blendColors(colors: string[]): string {
  if (colors.length === 0) return '#f3f4f6';
  if (colors.length === 1) return colors[0];

  // Convert hex colors to RGB
  const rgbColors = colors.map(hexToRgb).filter(Boolean);
  if (rgbColors.length === 0) return '#f3f4f6';

  // Calculate average RGB values
  const avgR = Math.round(rgbColors.reduce((sum, color) => sum + color!.r, 0) / rgbColors.length);
  const avgG = Math.round(rgbColors.reduce((sum, color) => sum + color!.g, 0) / rgbColors.length);
  const avgB = Math.round(rgbColors.reduce((sum, color) => sum + color!.b, 0) / rgbColors.length);

  return `rgb(${avgR}, ${avgG}, ${avgB})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function getEmotionIntensity(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence < 0.33) return 'low';
  if (confidence < 0.66) return 'medium';
  return 'high';
}

export function getMoodSummary(emotions: Array<{ emotion: string; confidence: number }>): string {
  if (emotions.length === 0) return 'No mood recorded';
  
  const sortedEmotions = emotions.sort((a, b) => b.confidence - a.confidence);
  const primary = sortedEmotions[0];
  
  if (emotions.length === 1) {
    return `Feeling ${getEmotionLabel(primary.emotion).toLowerCase()}`;
  }
  
  const secondary = sortedEmotions[1];
  return `Feeling ${getEmotionLabel(primary.emotion).toLowerCase()} and ${getEmotionLabel(secondary.emotion).toLowerCase()}`;
}
