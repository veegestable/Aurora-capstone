import type { ContextCategoryKey } from '../../services/mood/types'
import type { UserSettingsDoc } from '../../types/user-settings.types'

export const SCHOOL_TAGS = [
  'classes', 'study', 'quiz', 'exam', 'homework',
  'deadline', 'grou-project', 'presentation'
] as const

export const HEALTH_TAGS = [
  'headached', 'pain', 'sick', 'medication', 'exercise', 
  'nap', 'period', 'low-appetite', 'binge-eating'
] as const

export const SOCIAL_TAGS = [
  'friends', 'family', 'partner', 'conflict', 'alone', 'social-media'
] as const

export const FUN_TAGS = [
  'gaming', 'movie-series', 'music', 'travel', 'shopping', 
  'restaurant', 'hobby', 'outdoor'
] as const

export const PRODUCTIVITY_TAGS = [
  'work', 'chores', 'finance', 'commute', 'screen-overload'
] as const

export interface CategoryConfig {
  key: ContextCategoryKey
  title: string
  helper: string
  tags: readonly string[]
}

/**
 * Single source of truth for context-category metadata used by Step 3 of the
 * Mood Check-in UI. Tag arrays are derived from the `*_TAGS` exports above so
 * adding/removing a tag only happens in one place.
 */
export const CONTEXT_CATEGORIES: readonly CategoryConfig[] = Object.freeze([
  { key: 'school',       title: 'School',         helper: 'Academic activities and pressure.',     tags: SCHOOL_TAGS },
  { key: 'health',       title: 'Health',         helper: 'Physical condition and body signals.',  tags: HEALTH_TAGS },
  { key: 'social',       title: 'Social',         helper: 'Relationships and interactions.',       tags: SOCIAL_TAGS },
  { key: 'fun',          title: 'Fun / Leisure',  helper: 'Recreation and enjoyment.',             tags: FUN_TAGS },
  { key: 'productivity', title: 'Productivity',   helper: 'Workload and life tasks.',              tags: PRODUCTIVITY_TAGS },
])

/**
 * Returns the category keys whose tag list intersects `selectedTags`.
 * Used when persisting the mood log so we can index entries by category.
 */
/** Categories visible in check-in step 3, respecting profile toggles (mirrors mobile). */
export function getEnabledContextCategories(
  settings: UserSettingsDoc | null | undefined,
): readonly CategoryConfig[] {
  const packs = settings?.moodCategoryPacks
  const academicOn = settings?.academicContextMode !== 'off'
  return CONTEXT_CATEGORIES.filter((category) => {
    if (category.key === 'school') {
      if (!academicOn) return false
      if (packs?.school === false) return false
      return true
    }
    if (packs && packs[category.key] === false) return false
    return true
  })
}

export function categoriesFromTags(selectedTags: string[]): ContextCategoryKey[] {
  return CONTEXT_CATEGORIES
    .filter((c) => c.tags.some((t) => selectedTags.includes(t)))
    .map((c) => c.key)
}

const TAGS_BY_CATEGORY: Record<ContextCategoryKey, readonly string[]> = {
  school: SCHOOL_TAGS,
  health: HEALTH_TAGS,
  social: SOCIAL_TAGS,
  fun: FUN_TAGS,
  productivity: PRODUCTIVITY_TAGS,
}

/** Words placed before "energy" in the journal summary line. */
function describeEnergy(value: number): string {
  if (value <= 1) return 'very low'
  if (value === 2) return 'low'
  if (value === 3) return 'moderate'
  if (value === 4) return 'high'
  return 'very high'
}

/** Words placed before "stress" in the journal summary line. */
function describeStress(value: number): string {
  if (value <= 1) return 'very low'
  if (value === 2) return 'low'
  if (value === 3) return 'moderate'
  if (value === 4) return 'elevated'
  return 'overwhelming'
}

/** Joins a tag list into natural language with an Oxford comma + "+N more" tail. */
function tagPhrase(tags: string[], maxVisible = 5): string {
  const clean = tags.filter(Boolean)

  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`

  const visible = clean.slice(0, maxVisible)
  const extra = clean.length - visible.length
  const base = visible.length === 3
    ? `${visible[0]}, ${visible[1]}, and ${visible[2]}`
    : `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`

  return extra > 0 ? `${base} (+${extra} more)` : base
}

export interface BuildJournalDraftInput {
  emotionLabel: string
  energyLevel: number
  stressLevel: number
  selectedTags: string[]
}

/** Builds the auto-filled journal draft. */
export function buildJournalDraft(input: BuildJournalDraftInput): string {
  const { emotionLabel, energyLevel, stressLevel, selectedTags } = input
  const stressTone = stressLevel >= 4
    ? 'I felt emotionally heavy because of it.'
    : stressLevel <= 2
      ? 'It felt manageable overall.'
      : 'It sat in the middle of my day.'
  const tagsIn = (key: ContextCategoryKey): string[] =>
    selectedTags.filter((t) => (TAGS_BY_CATEGORY[key] as readonly string[]).includes(t))
  const lines: string[] = []
  const schoolTags = tagsIn('school')
  if (schoolTags.length > 0) {
    lines.push(`In school, I dealt with ${tagPhrase(schoolTags)}, and it affected my focus.`)
  }
  const funTags = tagsIn('fun')
  if (funTags.length > 0) {
    lines.push(`For fun, I spent time on ${tagPhrase(funTags)}, and it changed how my day felt.`)
  }
  const socialTags = tagsIn('social')
  if (socialTags.length > 0) {
    lines.push(`Socially, ${tagPhrase(socialTags)} stood out and shaped my emotions.`)
  }
  const healthTags = tagsIn('health')
  if (healthTags.length > 0) {
    lines.push(`Health-wise, I noticed ${tagPhrase(healthTags)}, and it really shaped how I felt inside. ${stressTone}`)
  }
  const productivityTags = tagsIn('productivity')
  if (productivityTags.length > 0) {
    const tone = stressLevel >= 4 ? 'pressured and stretched' : 'busy but trying to stay steady'
    lines.push(`For productivity, juggling ${tagPhrase(productivityTags)} made me feel ${tone}.`)
  }
  const summary = `Today I felt ${emotionLabel}, with ${describeEnergy(energyLevel)} energy and ${describeStress(stressLevel)} stress.`
  return lines.length === 0 ? summary : `${summary} ${lines.join(' ')}`
}

/** 
 * "Light day" / "Moderate day" / "Heavy day" pill copy based on
 * the count of school-related tags selected. 
 */
export function getSchoolWorkloadBand(schoolTagCount: number): 'Light day' | 'Moderate day' | 'Heavy day' {
  if (schoolTagCount === 0) return 'Light day'
  if (schoolTagCount <= 2) return 'Moderate day'
  return 'Heavy day'
}

/** 
 * Caption line under the workload band. Singular/plural aware. 
 */
export function getSchoolWorkloadCaption(schoolTagCount: number): string {
  return `Based on ${schoolTagCount} school tag${schoolTagCount === 1 ? '' : 's'} selected`
}

/**
 * Aggregate Pressure pill that describes the *whole day* (every category).
 * "Light" / "Steady" / "Heavy" / "Intense" based on the total selected tags.
 */
export function getOverallPressureLabel(totalTags: number): 'Light' | 'Steady' | 'Heavy' | 'Intense' {
  if (totalTags === 0) return 'Light'
  if (totalTags <= 3) return 'Steady'
  if (totalTags <= 6) return 'Heavy'
  return 'Intense'
}

/**
 * Friendly category label for a mood duration in minutes.
 * Mirrors the mobile copy at `mobile/src/components/MoodCheckIn.tsx:1050`.
 */
export function getDurationCategoryLabel(minutes: number): string {
  if (minutes < 15) return 'Just a moment'
  if (minutes <= 60) return 'About an hour'
  if (minutes <= 180) return 'A few hours'
  if (minutes <= 480) return 'Most of the day'
  return 'All day / Ongoing'
}