import { useMemo } from 'react';

export function useAuditLog() {
    const auditLogs = useMemo(() => [], []);
    return { auditLogs, loading: false };
}
