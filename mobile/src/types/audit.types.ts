export interface AuditEntry {
    id: string;
    performedBy: string;
    action: string;
    targetType: string;
    targetId: string;
}
