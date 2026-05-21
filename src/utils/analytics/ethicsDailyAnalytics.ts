/**
 * Daily analytics helpers (deterministic, non-clinical) — mirrors mobile.
 */

export type StressBand = 'Low' | 'Moderate' | 'High'

export function energyLevelToMoodScale(energy: number): number {
  const e = Number(energy)
  if (!Number.isFinite(e)) return 3
  return Math.min(5, Math.max(1, Math.ceil(e / 2)))
}

const SCHOOL_EVENT_TAGS = new Set([
  'classes',
  'study',
  'quiz',
  'exam',
  'homework',
  'deadline',
  'group-project',
  'presentation',
])

export function taskCountFromLog(log: { eventTags?: string[] }): number {
  const tags = Array.isArray(log.eventTags) ? log.eventTags : []
  return tags.filter((tag) => SCHOOL_EVENT_TAGS.has(tag)).length
}

export function calculateStressLevel(mood: number, tasks: number): number {
  const moodStress = (5 - mood) / 4
  const taskStress = Math.min(tasks / 10, 1)
  return moodStress * 0.6 + taskStress * 0.4
}

export function classifyStress(score: number): StressBand {
  if (score >= 0.75) return 'High'
  if (score >= 0.4) return 'Moderate'
  return 'Low'
}
