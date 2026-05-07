export interface MealScheduleItem {
  /** Stable id used as the key for `MoodLogEntryDoc.mealResponses[].mealId`. */
  id: string
  /** Display label, e.g. "Breakfast". */
  label: string
  /** `HH:mm` (24-hour, device-local). */
  time: string
}

export interface UserSettingsDoc {
  dayResetHour?: number
  timezone?: string
  shareCheckInsWithGuidance?: boolean
  academicContextMode?: 'active' | 'relaxed' | 'off'
  moodCategoryPacks?: {
    school?: boolean
    health?: boolean
    social?: boolean
    fun?: boolean
    productivity?: boolean
  }
  /** Student's configured meals (Profile → Meal Schedule). */
  mealSchedule?: MealScheduleItem[]
  /** `HH:mm` of usual bath time (Profile → Bath Schedule). */
  usualBathTime?: string
  /** `HH:mm` of usual wake-up (Profile → Wake-Up Schedule). */
  usualWakeTime?: string
  /** Daily check-in reminder hour (0–23). Default 7. */
  reminderHour?: number
  /** Daily check-in reminder minute (0–59). Default 0. */
  reminderMinute?: number
  /** Master toggle for daily reminders. */
  remindersEnabled?: boolean
  /** Notify on session updates. */
  sessionUpdatesEnabled?: boolean
  createdAt?: string
  updatedAt?: string
}