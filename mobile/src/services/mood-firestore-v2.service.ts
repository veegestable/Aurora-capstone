import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  Timestamp,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserSettingsDoc {
  dayResetHour: number;
  timezone: string;
  reminderHour?: number;
  remindersEnabled?: boolean;
  academicContextEnabled?: boolean;
  enabledContextCategories?: ContextCategoryKey[];
  updatedAt?: Timestamp;
}

export type ContextCategoryKey = 'school' | 'health' | 'social' | 'fun' | 'productivity';
export type SleepQuality = 'poor' | 'fair' | 'good';

export interface DailyContextDoc {
  exams: number;
  quizzes: number;
  deadlines: number;
  assignments: number;
  notes: string;
  sleepQuality?: SleepQuality;
  createdAt: Timestamp;
}

export interface MoodLogEntryDoc {
  mood: string;
  intensity: number;
  stress: number;
  energy: number;
  sleepQuality: SleepQuality;
  timestamp: Timestamp;
  color: string;
  dayKey: string;
  eventCategories?: ContextCategoryKey[];
  eventTags?: string[];
}

/** Client-side row after reading Firestore (Date instead of Timestamp). */
export type MoodLogEntryRow = Omit<MoodLogEntryDoc, 'timestamp'> & { id: string; timestamp: Date };

const DEFAULT_SETTINGS: UserSettingsDoc = {
  dayResetHour: 0,
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
  reminderHour: 7,
  remindersEnabled: true,
  academicContextEnabled: true,
  enabledContextCategories: ['school', 'health', 'social', 'fun', 'productivity'],
};

export async function getUserSettings(userId: string): Promise<UserSettingsDoc> {
  const ref = doc(db, 'userSettings', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_SETTINGS };
  const d = snap.data() as DocumentData;
  return {
    dayResetHour: typeof d.dayResetHour === 'number' ? Math.min(23, Math.max(0, d.dayResetHour)) : 0,
    timezone: typeof d.timezone === 'string' && d.timezone.trim() ? d.timezone.trim() : DEFAULT_SETTINGS.timezone,
    reminderHour: typeof d.reminderHour === 'number' ? Math.min(23, Math.max(0, d.reminderHour)) : (DEFAULT_SETTINGS.reminderHour ?? 7),
    remindersEnabled: typeof d.remindersEnabled === 'boolean' ? d.remindersEnabled : (DEFAULT_SETTINGS.remindersEnabled ?? true),
    academicContextEnabled: typeof d.academicContextEnabled === 'boolean' ? d.academicContextEnabled : true,
    enabledContextCategories: Array.isArray(d.enabledContextCategories)
      ? (d.enabledContextCategories.filter((x: unknown) => typeof x === 'string') as ContextCategoryKey[])
      : [...(DEFAULT_SETTINGS.enabledContextCategories || [])],
    updatedAt: d.updatedAt,
  };
}

export async function updateUserSettings(
  userId: string,
  partial: Partial<Pick<UserSettingsDoc, 'dayResetHour' | 'timezone' | 'reminderHour' | 'remindersEnabled' | 'academicContextEnabled' | 'enabledContextCategories'>>
): Promise<void> {
  const ref = doc(db, 'userSettings', userId);
  await setDoc(
    ref,
    {
      ...partial,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function createMoodLogEntry(userId: string, entry: Omit<MoodLogEntryDoc, 'timestamp'> & { timestamp: Date }) {
  const col = collection(db, 'moodLogs', userId, 'entries');
  const payload: MoodLogEntryDoc = {
    mood: entry.mood,
    intensity: entry.intensity,
    stress: entry.stress,
    energy: entry.energy,
    sleepQuality: entry.sleepQuality,
    color: entry.color,
    dayKey: entry.dayKey,
    eventCategories: entry.eventCategories ?? [],
    eventTags: entry.eventTags ?? [],
    timestamp: Timestamp.fromDate(entry.timestamp),
  };
  const docRef = await addDoc(col, payload);
  return {
    id: docRef.id,
    mood: entry.mood,
    intensity: entry.intensity,
    stress: entry.stress,
    energy: entry.energy,
    sleepQuality: entry.sleepQuality,
    color: entry.color,
    dayKey: entry.dayKey,
    eventCategories: entry.eventCategories ?? [],
    eventTags: entry.eventTags ?? [],
    timestamp: entry.timestamp,
  };
}

export async function getMoodLogEntries(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<MoodLogEntryRow[]> {
  const snap = await getDocs(entriesQuery(userId, startDate, endDate));
  return snap.docs.map((d) => {
    const x = d.data() as MoodLogEntryDoc;
    return {
      id: d.id,
      ...x,
      timestamp: x.timestamp?.toDate?.() ?? new Date(),
    };
  });
}

function entriesQuery(userId: string, startDate?: Date, endDate?: Date) {
  const col = collection(db, 'moodLogs', userId, 'entries');
  if (startDate && endDate) {
    return query(
      col,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );
  }
  if (startDate) {
    return query(col, where('timestamp', '>=', Timestamp.fromDate(startDate)), orderBy('timestamp', 'desc'));
  }
  if (endDate) {
    return query(col, where('timestamp', '<=', Timestamp.fromDate(endDate)), orderBy('timestamp', 'desc'));
  }
  return query(col, orderBy('timestamp', 'desc'));
}

export function subscribeMoodLogEntries(
  userId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  onNext: (entries: MoodLogEntryRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = entriesQuery(userId, startDate, endDate);
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data() as MoodLogEntryDoc;
        return {
          id: d.id,
          ...x,
          timestamp: x.timestamp?.toDate?.() ?? new Date(),
        };
      });
      onNext(list);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function hasMoodEntryForDayKey(userId: string, dayKey: string): Promise<boolean> {
  const q = query(
    collection(db, 'moodLogs', userId, 'entries'),
    where('dayKey', '==', dayKey),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

const dailyDayCollection = (userId: string) => collection(doc(db, 'dailyContext', userId), 'days');

export async function getDailyContext(userId: string, dayKey: string): Promise<DailyContextDoc | null> {
  const ref = doc(dailyDayCollection(userId), dayKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as DailyContextDoc;
}

export async function setDailyContext(
  userId: string,
  dayKey: string,
  data: Omit<DailyContextDoc, 'createdAt'> & { createdAt?: Timestamp }
): Promise<void> {
  const ref = doc(dailyDayCollection(userId), dayKey);
  const createdAt = data.createdAt ?? Timestamp.now();
  await setDoc(ref, {
    exams: data.exams,
    quizzes: data.quizzes,
    deadlines: data.deadlines,
    assignments: data.assignments,
    notes: data.notes ?? '',
    sleepQuality: data.sleepQuality,
    createdAt,
  });
}

export async function getDailyContextsInRange(
  userId: string,
  dayKeys: string[]
): Promise<Map<string, DailyContextDoc>> {
  const map = new Map<string, DailyContextDoc>();
  await Promise.all(
    dayKeys.map(async (k) => {
      const ctx = await getDailyContext(userId, k);
      if (ctx) map.set(k, ctx);
    })
  );
  return map;
}
