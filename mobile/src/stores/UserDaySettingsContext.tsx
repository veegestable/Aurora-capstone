import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getUserSettings,
  normalizeSettingsHHmm,
  updateUserSettings,
} from "../services/mood-firestore-v2.service";
import { defaultUserTimezone } from "../utils/dayKey";
import type { ContextCategoryKey } from "../services/mood-firestore-v2.service";
import type { MealScheduleItem } from "../services/mood-firestore-v2.service";

export interface UserDaySettingsValue {
  dayResetHour: number;
  timezone: string;
  reminderHour: number;
  reminderMinute: number;
  remindersEnabled: boolean;
  academicContextEnabled: boolean;
  enabledContextCategories: ContextCategoryKey[];
  mealSchedule: MealScheduleItem[];
  /** `HH:mm` or empty when unset; used for smart check-in prompts. */
  usualWakeTime: string;
  usualBathTime: string;
  loading: boolean;
  refresh: () => Promise<void>;
  setDayResetHour: (hour: number) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
  setReminderHour: (hour: number) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  setAcademicContextEnabled: (enabled: boolean) => Promise<void>;
  setCategoryEnabled: (
    category: ContextCategoryKey,
    enabled: boolean,
  ) => Promise<void>;
  setMealSchedule: (schedule: MealScheduleItem[]) => Promise<void>;
  setUsualWakeTime: (hhmm: string) => Promise<void>;
  setUsualBathTime: (hhmm: string) => Promise<void>;
}

const UserDaySettingsContext = createContext<UserDaySettingsValue | undefined>(
  undefined,
);

export function UserDaySettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dayResetHour, setDayResetHourState] = useState(0);
  const [timezone, setTimezoneState] = useState(defaultUserTimezone());
  const [reminderHour, setReminderHourState] = useState(7);
  const [reminderMinute, setReminderMinuteState] = useState(0);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);
  const [academicContextEnabled, setAcademicContextEnabledState] =
    useState(true);
  const [enabledContextCategories, setEnabledContextCategoriesState] = useState<
    ContextCategoryKey[]
  >(["school", "health", "social", "fun", "productivity"]);
  const [mealSchedule, setMealScheduleState] = useState<MealScheduleItem[]>([]);
  const [usualWakeTime, setUsualWakeTimeState] = useState("");
  const [usualBathTime, setUsualBathTimeState] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setDayResetHourState(0);
      setTimezoneState(defaultUserTimezone());
      setReminderHourState(7);
      setReminderMinuteState(0);
      setRemindersEnabledState(true);
      setAcademicContextEnabledState(true);
      setEnabledContextCategoriesState([
        "school",
        "health",
        "social",
        "fun",
        "productivity",
      ]);
      setMealScheduleState([]);
      setUsualWakeTimeState("");
      setUsualBathTimeState("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const s = await getUserSettings(user.id);
      setDayResetHourState(s.dayResetHour);
      setTimezoneState(s.timezone || defaultUserTimezone());
      setReminderHourState(
        typeof s.reminderHour === "number" ? s.reminderHour : 7,
      );
      setReminderMinuteState(
        typeof s.reminderMinute === "number" ? s.reminderMinute : 0,
      );
      setRemindersEnabledState(
        typeof s.remindersEnabled === "boolean" ? s.remindersEnabled : true,
      );
      setAcademicContextEnabledState(s.academicContextEnabled ?? true);
      setEnabledContextCategoriesState(
        s.enabledContextCategories?.length
          ? s.enabledContextCategories
          : ["school", "health", "social", "fun", "productivity"],
      );
      setMealScheduleState(Array.isArray(s.mealSchedule) ? s.mealSchedule : []);
      setUsualWakeTimeState(s.usualWakeTime ?? "");
      setUsualBathTimeState(s.usualBathTime ?? "");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setDayResetHour = useCallback(
    async (hour: number) => {
      if (!user?.id) return;
      const h = Math.min(23, Math.max(0, Math.floor(hour)));
      await updateUserSettings(user.id, { dayResetHour: h });
      setDayResetHourState(h);
    },
    [user?.id],
  );

  const setTimezone = useCallback(
    async (tz: string) => {
      if (!user?.id) return;
      const t = tz.trim() || defaultUserTimezone();
      await updateUserSettings(user.id, { timezone: t });
      setTimezoneState(t);
    },
    [user?.id],
  );

  const setReminderHour = useCallback(
    async (hour: number) => {
      if (!user?.id) return;
      const h = Math.min(23, Math.max(0, Math.floor(hour)));
      await updateUserSettings(user.id, { reminderHour: h, reminderMinute: 0 });
      setReminderHourState(h);
      setReminderMinuteState(0);
    },
    [user?.id],
  );

  const setReminderTime = useCallback(
    async (hour: number, minute: number) => {
      if (!user?.id) return;
      const h = Math.min(23, Math.max(0, Math.floor(hour)));
      const m = Math.min(59, Math.max(0, Math.floor(minute)));
      await updateUserSettings(user.id, { reminderHour: h, reminderMinute: m });
      setReminderHourState(h);
      setReminderMinuteState(m);
    },
    [user?.id],
  );

  const setRemindersEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user?.id) return;
      await updateUserSettings(user.id, { remindersEnabled: enabled });
      setRemindersEnabledState(enabled);
    },
    [user?.id],
  );

  const setAcademicContextEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user?.id) return;
      await updateUserSettings(user.id, { academicContextEnabled: enabled });
      setAcademicContextEnabledState(enabled);
    },
    [user?.id],
  );

  const setCategoryEnabled = useCallback(
    async (category: ContextCategoryKey, enabled: boolean) => {
      if (!user?.id) return;
      const next = enabled
        ? Array.from(new Set([...enabledContextCategories, category]))
        : enabledContextCategories.filter((x) => x !== category);
      await updateUserSettings(user.id, { enabledContextCategories: next });
      setEnabledContextCategoriesState(next);
    },
    [enabledContextCategories, user?.id],
  );

  const setMealSchedule = useCallback(
    async (schedule: MealScheduleItem[]) => {
      if (!user?.id) return;
      await updateUserSettings(user.id, { mealSchedule: schedule });
      setMealScheduleState(schedule);
    },
    [user?.id],
  );

  const setUsualWakeTime = useCallback(
    async (hhmm: string) => {
      if (!user?.id) return;
      const normalized = normalizeSettingsHHmm(hhmm);
      await updateUserSettings(user.id, { usualWakeTime: normalized });
      setUsualWakeTimeState(normalized);
    },
    [user?.id],
  );

  const setUsualBathTime = useCallback(
    async (hhmm: string) => {
      if (!user?.id) return;
      const normalized = normalizeSettingsHHmm(hhmm);
      await updateUserSettings(user.id, { usualBathTime: normalized });
      setUsualBathTimeState(normalized);
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({
      dayResetHour,
      timezone,
      reminderHour,
      reminderMinute,
      remindersEnabled,
      academicContextEnabled,
      enabledContextCategories,
      mealSchedule,
      usualWakeTime,
      usualBathTime,
      loading,
      refresh,
      setDayResetHour,
      setTimezone,
      setReminderHour,
      setReminderTime,
      setRemindersEnabled,
      setAcademicContextEnabled,
      setCategoryEnabled,
      setMealSchedule,
      setUsualWakeTime,
      setUsualBathTime,
    }),
    [
      dayResetHour,
      timezone,
      reminderHour,
      reminderMinute,
      remindersEnabled,
      academicContextEnabled,
      enabledContextCategories,
      mealSchedule,
      usualWakeTime,
      usualBathTime,
      loading,
      refresh,
      setDayResetHour,
      setTimezone,
      setReminderHour,
      setReminderTime,
      setRemindersEnabled,
      setAcademicContextEnabled,
      setCategoryEnabled,
      setMealSchedule,
      setUsualWakeTime,
      setUsualBathTime,
    ],
  );

  return (
    <UserDaySettingsContext.Provider value={value}>
      {children}
    </UserDaySettingsContext.Provider>
  );
}

export function useUserDaySettings(): UserDaySettingsValue {
  const ctx = useContext(UserDaySettingsContext);
  if (!ctx) {
    throw new Error(
      "useUserDaySettings must be used within UserDaySettingsProvider",
    );
  }
  return ctx;
}
