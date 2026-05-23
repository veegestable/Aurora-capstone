import { writeAuditLog } from './post/writeAuditLog'
import { getAuditLogs } from './get/getAuditLogs'
import { getEngagementSnapshotLastDays } from './get/getEngagementSnapshotLastDays'

export const auditLogsService = {
  writeAuditLog,
  getAuditLogs,
  getEngagementSnapshotLastDays,
}