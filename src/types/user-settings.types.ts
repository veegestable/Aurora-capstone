export interface UserSettingsDoc {
  dayResetHour?: number;
  timezone?: string;
  shareCheckInsWithGuidance?: boolean;
  academicContextMode?: 'active' | 'relaxed' | 'off';
  moodCategoryPacks?: {
    school?: boolean;
    health?: boolean;
    social?: boolean;
    fun?: boolean;
    productivity?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}