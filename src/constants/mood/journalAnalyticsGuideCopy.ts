/** Mirrors mobile Analytics.tsx InfoGuide copy; week wording adjusted for 7-day window. */

export const GUIDE_MOOD_FREQUENCY_TODAY =
  'This chart shows how many check-ins each mood has today.\n\nLarger slice = higher count for that mood.\n\nIt is based on check-in count, not duration.'

export const GUIDE_MOOD_FREQUENCY_WEEK =
  'This chart shows how many check-ins each mood has in the last 7 days.\n\nLarger slice = higher count for that mood.\n\nIt is based on check-in count, not duration.'

export const GUIDE_MOOD_DURATION =
  'Each check-in duration is treated as look-back time from when you logged.\n\nExample: logging 10 minutes at 9:00 means 8:50 to 9:00.\n\nOverlapping time blocks of the same mood are merged so minutes are not double-counted.'

export const GUIDE_MOOD_INTENSITY =
  'This compares average intensity (1–10) per mood.\n\nIt uses a simple average from check-ins of that mood.\n\nn means sample size (how many entries were used for that mood).'

export function guideMostFrequentMood(periodDays: number): string {
  const windowLabel = periodDays === 1 ? 'today' : `the last ${periodDays} days`
  return `This card shows your most frequent logged mood from ${windowLabel}.\n\nIt uses the same count as the Mood frequency chart — the mood you chose on each check-in, not face detection alone.\n\nIf two moods tie on check-in count, the one with more total logged duration wins.`
}

export function guideMoodFrequencyPeriod(periodDays: number): string {
  const windowLabel = periodDays === 1 ? 'today' : `the last ${periodDays} days`
  return `This chart shows how many check-ins each mood has in ${windowLabel}.\n\nLarger slice = higher count for that mood.\n\nIt is based on check-in count, not duration.`
}

export const ETHICS_ANALYTICS_CHARTS =
  'Nothing here diagnoses you or guesses what comes next.'