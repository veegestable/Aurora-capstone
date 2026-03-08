export interface AuditLog {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
}

export const auditLogsService = {
    async write(_entry: Omit<AuditLog, 'id'>): Promise<void> {
        return Promise.resolve();
    },
};
