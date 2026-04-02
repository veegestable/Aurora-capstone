// Aurora 5-mood blending system (Calendar + Day details)
// Fixed palette + explanation rules: do not change these constants.

export type MoodLog = {
  mood: 'Happy' | 'Sad' | 'Angry' | 'Surprise' | 'Neutral';
  intensity: number; // 1–5
};

// Fixed mood definitions (do not change)
export const MOOD_COLORS: Record<string, string> = {
  Happy: '#eab308', // yellow
  Sad: '#3b82f6', // blue
  Angry: '#ef4444', // red
  Surprise: '#f97316', // orange
  Neutral: '#9ca3af', // gray
};

export const MOOD_EMOJIS: Record<string, string> = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Surprise: '😲',
  Neutral: '😐',
};

function clampIntensity(intensity: number): number {
  // Blend system expects 1–5. Clamp to keep visuals stable.
  return Math.max(1, Math.min(5, Math.round(intensity)));
}

export function blendMoodColors(logs: MoodLog[]): string {
  if (!logs || logs.length === 0) return '#1e293b'; // no log = dark default

  let r = 0;
  let g = 0;
  let b = 0;
  let totalWeight = 0;

  for (const log of logs) {
    const hex = MOOD_COLORS[log.mood] ?? '#9ca3af';

    // Neutral is visually weak — cap its weight at 3
    // so it never overpowers genuinely felt emotions.
    const intensity = clampIntensity(log.intensity);
    const weight = log.mood === 'Neutral' ? Math.min(intensity, 3) : intensity;

    const bigint = parseInt(hex.replace('#', ''), 16);
    r += ((bigint >> 16) & 255) * weight;
    g += ((bigint >> 8) & 255) * weight;
    b += (bigint & 255) * weight;
    totalWeight += weight;
  }

  r = Math.round(r / totalWeight);
  g = Math.round(g / totalWeight);
  b = Math.round(b / totalWeight);

  return `rgb(${r}, ${g}, ${b})`;
}

function intensityLabel(intensity: number): string {
  if (intensity === 5) return 'very strongly';
  if (intensity === 4) return 'strongly';
  if (intensity === 3) return 'moderately';
  if (intensity === 2) return 'mildly';
  return 'slightly';
}

export function generateExplanation(logs: MoodLog[]): string {
  if (!logs || logs.length === 0) {
    return 'No mood was logged on this day.';
  }

  const sorted = [...logs].sort((a, b) => b.intensity - a.intensity);
  const dominant = sorted[0];

  // Single mood
  if (logs.length === 1) {
    return `You logged feeling ${dominant.mood.toLowerCase()} ${intensityLabel(
      clampIntensity(dominant.intensity),
    )} on this day.`;
  }

  // Two moods
  if (logs.length === 2) {
    const other = sorted[1];
    return `You logged a mix of ${dominant.mood.toLowerCase()} and ${other.mood.toLowerCase()} on this day. ${dominant.mood} was more present. The blended color above reflects both feelings together.`;
  }

  // Three or more moods
  const topTwo = sorted.slice(0, 2);
  const remainingCount = logs.length - 2;

  return `You logged several emotions on this day. ${topTwo[0].mood} stood out the most, followed by ${topTwo[1].mood.toLowerCase()}${
    remainingCount > 0
      ? `, along with ${remainingCount} other feeling${remainingCount > 1 ? 's' : ''}`
      : ''
  }. The blended color reflects your emotional mix for the day.`;
}

