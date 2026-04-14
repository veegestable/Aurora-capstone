import { blendColors } from './blendColors';

export interface MoodEntry {
  mood: string;
  intensity: number;
  stress: number;
  energy: number;
  timestamp: Date;
  color: string;
  dayKey?: string;
}

export interface HourlyAggregate {
  hour: number;
  mood: string;
  avgIntensity: number;
  avgStress: number;
  avgEnergy: number;
  blendedColor: string;
  entryCount: number;
}

export interface DailyAggregate {
  dayKey: string;
  dominantMood: string;
  avgIntensity: number;
  avgStress: number;
  avgEnergy: number;
  blendedColor: string;
  entryCount: number;
}

function dominantMoodByIntensity(entries: MoodEntry[]): string {
  const byMood: Record<string, number> = {};
  for (const e of entries) {
    const k = (e.mood || 'neutral').toLowerCase();
    byMood[k] = (byMood[k] ?? 0) + e.intensity;
  }
  let best = 'neutral';
  let max = -1;
  for (const [m, sum] of Object.entries(byMood)) {
    if (sum > max) {
      max = sum;
      best = m;
    }
  }
  return best;
}

export function aggregateByHour(entries: MoodEntry[]): HourlyAggregate[] {
  const groups = new Map<number, MoodEntry[]>();
  for (const e of entries) {
    const h = e.timestamp.getHours();
    const arr = groups.get(h) ?? [];
    arr.push(e);
    groups.set(h, arr);
  }
  const hours = [...groups.keys()].sort((a, b) => a - b);
  return hours.map((hour) => {
    const list = groups.get(hour)!;
    const n = list.length;
    const avgIntensity = list.reduce((s, x) => s + x.intensity, 0) / n;
    const avgStress = list.reduce((s, x) => s + x.stress, 0) / n;
    const avgEnergy = list.reduce((s, x) => s + x.energy, 0) / n;
    return {
      hour,
      mood: dominantMoodByIntensity(list),
      avgIntensity,
      avgStress,
      avgEnergy,
      blendedColor: blendColors(list.map((x) => ({ color: x.color, intensity: x.intensity }))),
      entryCount: n,
    };
  });
}

export function aggregateByDay(entries: MoodEntry[], dayKey: string): DailyAggregate {
  const list = entries.filter((e) => e.dayKey === dayKey);
  if (list.length === 0) {
    return {
      dayKey,
      dominantMood: '—',
      avgIntensity: 0,
      avgStress: 0,
      avgEnergy: 0,
      blendedColor: '#888888',
      entryCount: 0,
    };
  }
  const n = list.length;
  return {
    dayKey,
    dominantMood: dominantMoodByIntensity(list),
    avgIntensity: list.reduce((s, x) => s + x.intensity, 0) / n,
    avgStress: list.reduce((s, x) => s + x.stress, 0) / n,
    avgEnergy: list.reduce((s, x) => s + x.energy, 0) / n,
    blendedColor: blendColors(list.map((x) => ({ color: x.color, intensity: x.intensity }))),
    entryCount: n,
  };
}

/** Aggregate all entries in a set as one "day" (e.g. week-level rollups). */
export function aggregateEntriesAsSingleDay(entries: MoodEntry[]): Omit<DailyAggregate, 'dayKey'> & { dayKey?: string } {
  if (entries.length === 0) {
    return {
      dominantMood: '—',
      avgIntensity: 0,
      avgStress: 0,
      avgEnergy: 0,
      blendedColor: '#888888',
      entryCount: 0,
    };
  }
  const n = entries.length;
  return {
    dominantMood: dominantMoodByIntensity(entries),
    avgIntensity: entries.reduce((s, x) => s + x.intensity, 0) / n,
    avgStress: entries.reduce((s, x) => s + x.stress, 0) / n,
    avgEnergy: entries.reduce((s, x) => s + x.energy, 0) / n,
    blendedColor: blendColors(entries.map((x) => ({ color: x.color, intensity: x.intensity }))),
    entryCount: n,
  };
}

export function moodStabilityScore(intensities: number[]): number {
  if (intensities.length < 2) return 100;
  const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const variance = intensities.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intensities.length;
  const stdDev = Math.sqrt(variance);
  return Math.round(Math.max(0, 100 - (stdDev / 4.5) * 100));
}
