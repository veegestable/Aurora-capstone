// Firebase-based mood service for Aurora
import { firestoreService, type MoodData } from './firebase-firestore.service';
import { auth } from './firebase';
import {
  createMoodLogEntry,
  getMoodLogEntries,
  subscribeMoodLogEntries,
  type MoodLogEntryRow,
  type ContextCategoryKey,
  type SleepQuality,
} from './mood-firestore-v2.service';

export type MergedMoodLog = MoodData & { id: string; created_at?: Date; log_date: Date };

function mapV2EntryToMoodData(e: MoodLogEntryRow, userId: string): MergedMoodLog {
  const logDate = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
  return {
    id: e.id,
    entryId: e.id,
    user_id: userId,
    emotions: [{ emotion: e.mood, confidence: Math.min(1, Math.max(0, e.intensity / 10)), color: e.color }],
    notes: e.notes ?? '',
    log_date: logDate,
    energy_level: Math.min(10, Math.max(1, e.energy * 2)),
    stress_level: Math.min(10, Math.max(1, e.stress * 2)),
    detection_method: 'manual',
    mood: e.mood,
    intensity: e.intensity,
    color: e.color,
    dayKey: e.dayKey,
    sleep_quality: e.sleepQuality,
    event_categories: e.eventCategories ?? [],
    event_tags: e.eventTags ?? [],
    created_at: logDate,
  };
}

function mergeAndSort(legacy: MergedMoodLog[], v2: MergedMoodLog[]): MergedMoodLog[] {
  return [...legacy, ...v2].sort((a, b) => {
    const ta = a.log_date instanceof Date ? a.log_date.getTime() : new Date(a.log_date).getTime();
    const tb = b.log_date instanceof Date ? b.log_date.getTime() : new Date(b.log_date).getTime();
    return tb - ta;
  });
}

export const moodService = {
  async createMoodLog(moodData: any) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const now = typeof moodData.log_date === 'string' ? new Date(moodData.log_date) : moodData.log_date || new Date();
    const primary = moodData.emotions?.[0];
    const mood = primary?.emotion || moodData.mood || 'neutral';
    const conf = typeof primary?.confidence === 'number' ? primary.confidence : 0.7;
    const intensity = Math.max(1, Math.min(10, Math.round(conf * 10)));
    const stress = Math.max(1, Math.min(5, Math.round((moodData.stress_level ?? 5) / 2)));
    const energy = Math.max(1, Math.min(5, Math.round((moodData.energy_level ?? 5) / 2)));
    const color = primary?.color || '#888888';
    const dayKey = moodData.dayKey;
    const sleepQuality: SleepQuality =
      moodData.sleep_quality === 'poor' || moodData.sleep_quality === 'good' || moodData.sleep_quality === 'fair'
        ? moodData.sleep_quality
        : 'fair';
    const eventCategories = Array.isArray(moodData.event_categories)
      ? (moodData.event_categories.filter((x: unknown) => typeof x === 'string') as ContextCategoryKey[])
      : [];
    const eventTags = Array.isArray(moodData.event_tags)
      ? moodData.event_tags.filter((x: unknown) => typeof x === 'string')
      : [];
    const notes = typeof moodData.notes === 'string' ? moodData.notes.trim() : '';
    const journalSource: 'auto' | 'manual' =
      moodData.journal_source === 'manual' || moodData.journal_source === 'auto'
        ? moodData.journal_source
        : 'auto';
    if (!dayKey || typeof dayKey !== 'string') {
      throw new Error('dayKey is required for mood logs');
    }

    const created = await createMoodLogEntry(user.uid, {
      mood,
      intensity,
      stress,
      energy,
      sleepQuality,
      color,
      dayKey,
      eventCategories,
      eventTags,
      notes,
      journalSource,
      timestamp: now,
    });
    const row: MoodLogEntryRow = {
      id: created.id,
      mood: created.mood,
      intensity: created.intensity,
      stress: created.stress,
      energy: created.energy,
      sleepQuality: created.sleepQuality,
      color: created.color,
      dayKey: created.dayKey,
      eventCategories: created.eventCategories ?? [],
      eventTags: created.eventTags ?? [],
      timestamp: now,
    };
    return mapV2EntryToMoodData(row, user.uid);
  },

  async getMoodLogs(userId: string, startDate?: string, endDate?: string) {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    const [legacy, v2raw] = await Promise.all([
      firestoreService.getMoodLogs(userId, startDateObj, endDateObj),
      getMoodLogEntries(userId, startDateObj, endDateObj),
    ]);

    const legacyRows = legacy as MergedMoodLog[];
    const v2rows = v2raw.map((e) => mapV2EntryToMoodData(e, userId));
    return mergeAndSort(legacyRows, v2rows);
  },

  subscribeMoodLogs(
    userId: string,
    onNext: (logs: unknown[]) => void,
    startDate?: string,
    endDate?: string,
    onError?: (error: Error) => void
  ): () => void {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    let legacyList: MergedMoodLog[] = [];
    let v2List: MergedMoodLog[] = [];

    const emit = () => {
      onNext(mergeAndSort(legacyList, v2List));
    };

    const unsubLegacy = firestoreService.subscribeMoodLogs(
      userId,
      startDateObj,
      endDateObj,
      (logs) => {
        legacyList = logs as MergedMoodLog[];
        emit();
      },
      onError
    );

    const unsubV2 = subscribeMoodLogEntries(
      userId,
      startDateObj,
      endDateObj,
      (entries) => {
        v2List = entries.map((e) => mapV2EntryToMoodData(e, userId));
        emit();
      },
      onError
    );

    return () => {
      unsubLegacy();
      unsubV2();
    };
  },

  async updateMoodLog(_logId: string, _moodData: any) {
    console.warn('[moodService] updateMoodLog is deprecated for v2 entries; add a new check-in instead.');
    throw new Error('Updating past mood entries is not supported. Log how you feel again anytime.');
  },

  /** @deprecated Use hasMoodEntryForDayKey + v2 flow */
  async getTodayMoodLog(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const logs = await this.getMoodLogs(userId, startOfDay.toISOString(), endOfDay.toISOString());
    return logs.length > 0 ? logs[0] : null;
  },
};
