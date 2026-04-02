export interface AuditEntry {
    id: string;
    performedBy: string;
    performedByRole?: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
}
