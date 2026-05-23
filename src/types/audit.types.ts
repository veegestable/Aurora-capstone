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

/** Counts for one audit action type, split by performer role (7-day engagement). */
export interface RoleEngagementCounts {
  counselor: number
  student: number
  admin: number
  other: number
}

export interface EngagementSnapshot7d {
  windowDays: number
  windowStart: Date
  windowEnd: Date
  /** Log rows whose createdAt fell inside the window (after fetch cap). */
  eventsInWindow: number
  /** Fetched from Firestore (before date filter); if capped, snapshot may be incomplete. */
  fetchedRowCount: number
  byAction: {
    user_login: RoleEngagementCounts
    user_logout: RoleEngagementCounts
    app_active: RoleEngagementCounts
    message_sent: RoleEngagementCounts
  }
}
