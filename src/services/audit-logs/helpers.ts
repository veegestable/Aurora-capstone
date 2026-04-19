import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { AuditEntry } from '../../types/audit.types'

/**
 * Map a Firestore doc -> AuditEntry, safely coercing fields.
 */
export function mapAuditDoc(doc: QueryDocumentSnapshot): AuditEntry {
  const data = doc.data()

  return {
    id: doc.id,
    performedBy: String(data.performedBy ?? ''),
    performedByRole: data.performedByRole ? String(data.performedByRole) : undefined,
    action: String(data.action ?? ''),
    targetType: String(data.targetType ?? ''),
    targetId: String(data.targetId ?? ''),
    metadata: data.metadata ?? {},
    createdAt: data.createdAt?.toDate(),
  }
}