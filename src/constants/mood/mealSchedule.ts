import type { MealScheduleItem } from '../../types/user-settings.types'

/**
 * Used when the student has no meal schedule saved yet. The Profile editor
 * will eventually replace these with user-defined entries.
 */
export const DEFAULT_MEAL_SCHEDULE: readonly MealScheduleItem[] = Object.freeze([
  { id: 'breakfast', label: 'Breakfast', time: '07:30' },
  { id: 'lunch', label: 'Lunch', time: '12:00' },
  { id: 'dinner', label: 'Dinner', time: '18:30' },
])