import { collection, query, orderBy, limit, getDocs, where, type QueryConstraint } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { mapAuditDoc } from '../helpers'
import type { AuditEntry } from '../../../types/audit.types'

export interface AuditLogFilters {
  maxCount?: number
  action?: string
  performedByRole?: string
}

/**
 * Fetches audit log entries from Firestore, ordered by most recent first.
 * Supports optional filters for action and performedByRole.
 * 
 * @param filters Optional filters to apply to the query.
 * @returns A promise that resolves to an array of AuditEntry objects.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditEntry[]> {
  const { maxCount = 100, action, performedByRole } = filters

  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  ]

  if (action) constraints.unshift(where('action', '==', action))
  if (performedByRole) constraints.unshift(where('performedByRole', '==', performedByRole))

  const q = query(collection(db, 'audit_logs'), ...constraints)
  const snapshot = await getDocs(q)

  return snapshot.docs.map(mapAuditDoc)
}