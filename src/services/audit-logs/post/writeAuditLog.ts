import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { WriteAuditEntry } from '../../../types/audit.types'

/**
 * Writes a single audit log entry to Firestore.
 * Fire-and-forget on purpose - callers should NOT block on this.
 * 
 * @param entry The audit log entry to write.
 */
export async function writeAuditLog(entry: WriteAuditEntry): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...entry,
      createdAt: Timestamp.now()
    })
  } catch (error) {
    console.error('[audit] Failed to write audit log:', error)
  }
}