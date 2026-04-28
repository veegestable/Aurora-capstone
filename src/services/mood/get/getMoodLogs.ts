import { firestoreService } from '../../firebase-firestore'
import { moodV2Service } from '../../mood-v2'
import type { MoodLogEntryRow } from '../../../types/mood-v2.types'
import type { MoodData } from '../../firebase-firestore'

/** Unified mood log shape returned by the merged service. */
export interface MergedMoodLog extends MoodData {
  id: string
  created_at?: Date
  log_date: Date
  /** V2-specific fields (only present on v2 entries) */
  mood?: string
  intensity?: number
  color?: string
  dayKey?: string
  sleep_quality?: string
  event_categories?: string[]
  event_tags?: string[]
}

/** Map a v2 entry into the legacy-compatible shape so downstream consumers stay unchanged. */
function mapV2ToLegacy(e: MoodLogEntryRow, userId: string): MergedMoodLog {
  const logDate = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)
  return {
    id: e.id,
    user_id: userId,
    emotions: [{ emotion: e.mood, confidence: Math.min(1, Math.max(0, e.intensity / 10)), color: e.color }],
    notes: '',
    log_date: logDate,
    energy_level: Math.min(10, Math.max(1, e.energy * 2)),
    stress_level: Math.min(10, Math.max(1, e.stress * 2)),
    detection_method: 'manual',
    created_at: logDate,
    mood: e.mood,
    intensity: e.intensity,
    color: e.color,
    dayKey: e.dayKey,
    sleep_quality: e.sleepQuality,
    event_categories: e.eventCategories ?? [],
    event_tags: e.eventTags ?? [],
  }
}

function mergeAndSort(legacy: MergedMoodLog[], v2: MergedMoodLog[]): MergedMoodLog[] {
  return [...legacy, ...v2].sort((a, b) => {
    const ta = a.log_date instanceof Date ? a.log_date.getTime() : new Date(a.log_date).getTime()
    const tb = b.log_date instanceof Date ? b.log_date.getTime() : new Date(b.log_date).getTime()
    return tb - ta
  })
}

export const getMoodLogs = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  try {
    console.log('🔥 Fetching mood logs (legacy + v2) for user:', userId)

    const startDateObj = startDate ? new Date(startDate) : undefined
    const endDateObj = endDate ? new Date(endDate) : undefined

    const [legacyLogs, v2Entries] = await Promise.all([
      firestoreService.getMoodLogs(userId, startDateObj, endDateObj),
      moodV2Service.getMoodLogEntries(userId, startDateObj, endDateObj),
    ])

    const legacyRows = legacyLogs as MergedMoodLog[]
    const v2Rows = v2Entries.map((e) => mapV2ToLegacy(e, userId))
    const merged = mergeAndSort(legacyRows, v2Rows)

    console.log(`✅ Mood logs: ${legacyLogs.length} legacy + ${v2Entries.length} v2 = ${merged.length} total`)
    return merged
  } catch (error) {
    console.error('❌ Get mood logs error:', error)
    throw error
  }
}