import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserSettings, updateUserSettings } from '../services/mood-firestore-v2.service';
import { defaultUserTimezone } from '../utils/dayKey';

export interface UserDaySettingsValue {
  dayResetHour: number;
  timezone: string;
  loading: boolean;
  refresh: () => Promise<void>;
  setDayResetHour: (hour: number) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
}

const UserDaySettingsContext = createContext<UserDaySettingsValue | undefined>(undefined);

export function UserDaySettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dayResetHour, setDayResetHourState] = useState(0);
  const [timezone, setTimezoneState] = useState(defaultUserTimezone());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setDayResetHourState(0);
      setTimezoneState(defaultUserTimezone());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const s = await getUserSettings(user.id);
      setDayResetHourState(s.dayResetHour);
      setTimezoneState(s.timezone || defaultUserTimezone());
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
    [user?.id]
  );

  const setTimezone = useCallback(
    async (tz: string) => {
      if (!user?.id) return;
      const t = tz.trim() || defaultUserTimezone();
      await updateUserSettings(user.id, { timezone: t });
      setTimezoneState(t);
    },
    [user?.id]
  );

  const value = useMemo(
    () => ({
      dayResetHour,
      timezone,
      loading,
      refresh,
      setDayResetHour,
      setTimezone,
    }),
    [dayResetHour, timezone, loading, refresh, setDayResetHour, setTimezone]
  );

  return <UserDaySettingsContext.Provider value={value}>{children}</UserDaySettingsContext.Provider>;
}

export function useUserDaySettings(): UserDaySettingsValue {
  const ctx = useContext(UserDaySettingsContext);
  if (!ctx) {
    throw new Error('useUserDaySettings must be used within UserDaySettingsProvider');
  }
  return ctx;
}
