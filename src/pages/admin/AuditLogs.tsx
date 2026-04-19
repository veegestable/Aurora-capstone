import { useState, useEffect, useMemo } from 'react'
import { ScrollText, RefreshCw, Search } from 'lucide-react'
import { auditLogsService } from '../../services/audit-logs'
import type { AuditEntry } from '../../types/audit.types'

type RoleFilter = 'all' | 'admin' | 'counselor' | 'student'

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All Roles' },
  { key: 'admin', label: 'Admin' },
  { key: 'counselor', label: 'Counselor' },
  { key: 'student', label: 'Student' },
]

/** Maps action strings to readable badge colours. */
function actionBadgeClass(action: string): string {
  const lower = action.toLowerCase()
  if (lower.includes('approve')) return 'bg-green-500/10 text-green-600 border-green-500/30'
  if (lower.includes('reject')) return 'bg-red-500/10 text-red-500 border-red-500/30'
  if (lower.includes('send') || lower.includes('message')) return 'bg-aurora-secondary-blue/10 text-aurora-secondary-blue border-aurora-secondary-blue/30'
  if (lower.includes('session')) return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
  return 'bg-aurora-primary-dark/5 text-aurora-primary-dark/70 border-aurora-primary-dark/10'
}

function formatTimestamp(date?: Date): string {
  if (!date) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await auditLogsService.getAuditLogs({ maxCount: 200 })
      setLogs(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [])

  const filtered = useMemo(() => {
    let items = logs

    if (roleFilter !== 'all') {
      items = items.filter(
        (l) => l.performedByRole?.toLowerCase() === roleFilter
      )
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.performedBy.toLowerCase().includes(q) ||
          l.targetType.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q)
      )
    }

    return items
  }, [logs, roleFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
            Admin
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Audit Logs
          </h2>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh audit logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aurora-primary-dark/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by action, user, or target…"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-aurora-primary-dark/3 border border-aurora-primary-dark/10 rounded-lg text-aurora-primary-dark placeholder:text-aurora-primary-dark/30 outline-none focus:ring-2 focus:ring-aurora-secondary-blue/30 transition-shadow"
          aria-label="Search audit logs"
        />
      </div>

      {/* Role filter chips */}
      <div className="flex gap-2 flex-wrap">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
              roleFilter === f.key
                ? 'bg-aurora-secondary-blue text-white'
                : 'bg-aurora-primary-dark/5 text-aurora-primary-dark/60 hover:bg-aurora-primary-dark/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading audit logs…</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <ScrollText className="w-12 h-12 text-red-400/40 mx-auto mb-3" />
          <p className="text-red-500 text-sm font-semibold">{error}</p>
          <button
            onClick={loadLogs}
            className="mt-4 text-sm text-aurora-secondary-blue hover:underline cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ScrollText className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
          <p className="text-aurora-primary-dark/50 text-sm">
            {logs.length === 0 ? 'No audit logs yet.' : 'No logs match your filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-aurora-primary-dark/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-aurora-primary-dark/3 border-b border-aurora-primary-dark/10">
                <th className="text-left px-4 py-3 font-semibold text-aurora-primary-dark/60 text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 font-semibold text-aurora-primary-dark/60 text-xs uppercase tracking-wider hidden sm:table-cell">
                  Performed By
                </th>
                <th className="text-left px-4 py-3 font-semibold text-aurora-primary-dark/60 text-xs uppercase tracking-wider hidden md:table-cell">
                  Target
                </th>
                <th className="text-left px-4 py-3 font-semibold text-aurora-primary-dark/60 text-xs uppercase tracking-wider hidden lg:table-cell">
                  Role
                </th>
                <th className="text-right px-4 py-3 font-semibold text-aurora-primary-dark/60 text-xs uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aurora-primary-dark/5">
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-aurora-secondary-blue/3 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${actionBadgeClass(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-aurora-primary-dark/70 truncate max-w-[200px] hidden sm:table-cell font-mono text-xs">
                    {entry.performedBy}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-aurora-primary-dark/50 text-xs">
                      {entry.targetType}
                    </span>
                    <span className="text-aurora-primary-dark/30 mx-1">/</span>
                    <span className="text-aurora-primary-dark/70 text-xs font-mono truncate">
                      {entry.targetId}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {entry.performedByRole ? (
                      <span className="text-[11px] font-semibold text-aurora-secondary-blue bg-aurora-secondary-blue/10 px-2 py-0.5 rounded-full">
                        {entry.performedByRole}
                      </span>
                    ) : (
                      <span className="text-aurora-primary-dark/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-aurora-primary-dark/40 text-xs whitespace-nowrap">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer count */}
      {!loading && !error && filtered.length > 0 && (
        <p className="text-xs text-aurora-primary-dark/40 text-right">
          Showing {filtered.length} of {logs.length} entries
        </p>
      )}
    </div>
  )
}