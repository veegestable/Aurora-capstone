import { writeAuditLog } from './post/writeAuditLog'
import { getAuditLogs } from './get/getAuditLogs'

export const auditLogsService = {
  writeAuditLog,
  getAuditLogs
}