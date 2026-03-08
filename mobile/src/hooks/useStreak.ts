import { useMemo } from 'react';

export function useStreak(loggedDays: number) {
    const streak = useMemo(() => Math.max(0, loggedDays), [loggedDays]);
    return { streak };
}
