import { useMemo } from 'react';

export function useMessages() {
    const messages = useMemo(() => [], []);
    return { messages, loading: false };
}
