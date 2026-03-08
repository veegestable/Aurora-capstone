import { useMemo } from 'react';

export function useRiskFlags() {
    const riskFlags = useMemo(() => [], []);
    return { riskFlags, loading: false };
}
