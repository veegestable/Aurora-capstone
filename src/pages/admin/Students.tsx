import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminService, type AdminStudentUser } from '../../services/admin'
import { resolveCollegeCodeFromUserData } from '../../constants/colleges'
import { LetterAvatar } from '../../components/LetterAvatar'
import { GraduationCap, Search, RefreshCw } from 'lucide-react'

function studentMetaLine(s: AdminStudentUser): string {
  const college =
    resolveCollegeCodeFromUserData(s as unknown as Record<string, unknown>) ||
    (typeof s.department === 'string' ? s.department.trim() : '')
  const year = typeof s.year_level === 'string' ? s.year_level.trim() : ''
  if (college && year) {
    return `${college.toUpperCase()} • ${year.toUpperCase()}`
  }
  if (college) return college.toUpperCase()
  const program = typeof s.program === 'string' ? s.program.trim() : ''
  if (program) return program
  return 'NO PROGRAM'
}

function DetailRow({ label, value }: { label: string; value: string | undefined | null }) {
  const v = value?.trim()
  if (!v) return null
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-semibold text-aurora-text-muted">{label}</p>
      <p className="text-[13px] text-aurora-text-sec break-words leading-snug">{v}</p>
    </div>
  )
}

function DetailRowAlways({
  label,
  value,
  emptyLabel = 'Not set',
}: {
  label: string
  value: string | undefined | null
  emptyLabel?: string
}) {
  const v = value?.trim()
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-semibold text-aurora-text-muted">{label}</p>
      <p
        className={`text-[13px] break-words leading-snug tabular-nums ${
          v ? 'text-aurora-text-sec' : 'text-aurora-text-muted italic'
        }`}
      >
        {v || emptyLabel}
      </p>
    </div>
  )
}

function StudentRosterCard({ student }: { student: AdminStudentUser }) {
  const name = student.full_name?.trim() || 'Unknown'
  const meta = studentMetaLine(student)
  const email = student.email?.trim() || '—'

  return (
    <article className="card-aurora p-4 flex items-start gap-3.5 w-full">
      <LetterAvatar
        name={name}
        size={52}
        avatarUrl={student.avatar_url || undefined}
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0 w-full">
        <p className="font-bold text-white text-base leading-snug break-words">{name}</p>

        {student.preferred_name?.trim() ? (
          <p className="text-xs text-aurora-text-muted mt-1 break-words">
            Preferred: {student.preferred_name.trim()}
          </p>
        ) : null}

        <p className="text-[11px] font-semibold text-aurora-text-muted mt-2.5">Email</p>
        <p className="text-[13px] text-aurora-text-sec break-all leading-snug">{email}</p>

        <DetailRowAlways label="Student no." value={student.student_number} />
        <DetailRow label="Contact no." value={student.contact_number} />
        <DetailRow label="Program" value={student.program} />
        <DetailRow label="Year" value={student.year_level} />
        <DetailRow label="Department" value={student.department} />

        <p className="text-[10px] uppercase font-bold text-aurora-text-muted mt-2.5 tracking-wide">
          {meta}
        </p>
      </div>
    </article>
  )
}

export default function AdminStudents() {
  const [students, setStudents] = useState<AdminStudentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadStudents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const list = await adminService.getStudents()
      list.sort((a, b) =>
        (a.full_name ?? '').localeCompare(b.full_name ?? '', undefined, { sensitivity: 'base' }),
      )
      setStudents(list)
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.student_number?.toLowerCase().includes(q) ||
        s.program?.toLowerCase().includes(q) ||
        s.contact_number?.toLowerCase().includes(q) ||
        resolveCollegeCodeFromUserData(s as unknown as Record<string, unknown>)
          .toLowerCase()
          .includes(q),
    )
  }, [students, searchQuery])

  return (
    <div className="space-y-5 max-w-4xl w-full">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-aurora-border">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">Students</h2>
          <p className="text-xs text-aurora-text-sec mt-1 leading-relaxed">
            Read-only directory — no mood logs or performance data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStudents(true)}
          disabled={loading || refreshing}
          className="p-2 text-aurora-blue hover:bg-aurora-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          aria-label="Refresh student list"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing || loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-2.5 card-aurora rounded-full py-2.5 px-4">
        <Search className="w-[18px] h-[18px] text-aurora-text-muted shrink-0" aria-hidden />
        <input
          type="search"
          placeholder="Search name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-aurora-text-muted outline-none"
          aria-label="Search students"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-aurora-border border-t-aurora-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-aurora-text-muted mx-auto mb-3" />
          <p className="text-aurora-text-sec text-base">
            {searchQuery.trim() ? 'No students found' : 'No students found'}
          </p>
          {searchQuery.trim() ? (
            <p className="text-aurora-text-muted text-sm mt-1">Try a different search term.</p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {filtered.map((s) => (
            <li key={s.id}>
              <StudentRosterCard student={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
