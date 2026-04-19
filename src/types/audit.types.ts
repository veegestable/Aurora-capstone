export interface AuditEntry {
  id: string
  performedBy: string
  performedByRole?: string
  action: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
  createdAt?: Date
}

/** Fields required when writing a new audit entry (id + createdAt are auto-set). */
export type WriteAuditEntry = Omit<AuditEntry, 'id' | 'createdAt'>