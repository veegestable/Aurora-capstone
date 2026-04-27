import { useState, useEffect, useMemo } from 'react'
import { counselorService } from '../../services/counselor'
import { counselorCheckInContextService } from '../../services/counselor-checkin-context'
import { Search } from 'lucide-react'
import type { CounselorSignalPill } from '../../constants/counselor/counselor-checkin-signals'
import {
  COUNSELOR_SIGNAL_LABEL,
  COUNSELOR_SIGNAL_SORT,
  counselorSignalFromLogs,
} from '../../constants/counselor/counselor-checkin-signals'
import { formatTimeAgo } from '../../utils/riskHelpers'
import { LetterAvatar } from '../../components/LetterAvatar'

interface StudentEntry {
  id: string
  full_name: string
  email?: string
  signal: CounselorSignalPill
  lastLog: string
}

type SignalFilter = 'All Students' | CounselorSignalPill

const FILTERS: { label: string; value: SignalFilter }[] = [
  { label: 'All Students', value: 'All Students' },
  { label: 'Higher', value: 'higher_self_report' },
  { label: 'Moderate', value: 'moderate_self_report' },
  { label: 'Typical', value: 'typical_self_report' },
  { label: 'No check-ins', value: 'no_checkins' },
  { label: 'Sharing off', value: 'sharing_off' },
]

function getSignalStyle(signal: CounselorSignalPill) {
  switch (signal) {
    case 'higher_self_report':
      return { border: 'border-l-red-500', badgeBg: 'bg-red-500/10', badgeBorder: 'border-red-500/25', text: 'text-red-500' }
    case 'moderate_self_report':
      return { border: 'border-l-orange-500', badgeBg: 'bg-orange-500/10', badgeBorder: 'border-orange-500/25', text: 'text-orange-500' }
    case 'typical_self_report':
      return { border: 'border-l-blue-500', badgeBg: 'bg-blue-500/10', badgeBorder: 'border-blue-500/25', text: 'text-blue-500' }
    case 'no_checkins':
      return { border: 'border-l-amber-400', badgeBg: 'bg-amber-400/10', badgeBorder: 'border-amber-400/25', text: 'text-amber-400' }
    case 'sharing_off':
      return { border: 'border-l-gray-400', badgeBg: 'bg-gray-400/10', badgeBorder: 'border-gray-400/25', text: 'text-gray-400' }
  }
}

function StudentRow({ student }: { student: StudentEntry }) {
  const style = getSignalStyle(student.signal)

  return (
    <div
      className={`flex items-center card-aurora border-l-4 ${style.border} p-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`}
      aria-label={`View details for ${student.full_name}`}
    >
      <div className="p-3 pl-4">
        <LetterAvatar name={student.full_name} size={44} />
      </div>
      <div className="flex-1 py-3 min-w-0">
        <p className="font-bold text-aurora-primary-dark text-sm truncate">{student.full_name}</p>
        <p className="text-xs text-aurora-primary-dark/50 mt-0.5 truncate">
          {student.email} · {student.lastLog}
        </p>
      </div>
      <div className="pr-3 shrink-0">
        <span
          className={`inline-block text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
        >
          {COUNSELOR_SIGNAL_LABEL[student.signal]}
        </span>
      </div>
    </div>
  )
}

export default function Students() {
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<SignalFilter>('All Students')

  useEffect(() => {
    let cancelled = false

    async function fetchStudents() {
      try {
        const raw = await counselorService.getStudents()
        if (cancelled) return

        const mapped: StudentEntry[] = await Promise.all(
          raw.map(async (s) => {
            try {
              const { sharingEnabled, logs } = await counselorCheckInContextService.fetchStudentCheckInContext(s.id)
              const latestLog = logs[0]
              return {
                id: s.id,
                full_name: s.full_name || 'Student',
                email: s.email,
                signal: counselorSignalFromLogs(sharingEnabled, logs),
                lastLog: !sharingEnabled
                  ? 'Sharing off'
                  : (latestLog?.log_date ? formatTimeAgo(new Date(latestLog.log_date)) : 'No check-ins'),
              }
            } catch {
              return {
                id: s.id,
                full_name: s.full_name || 'Student',
                email: s.email,
                signal: 'sharing_off' as CounselorSignalPill,
                lastLog: 'Error loading',
              }
            }
          })
        )

        if (!cancelled) {
          setStudents(mapped.sort((a, b) => COUNSELOR_SIGNAL_SORT[a.signal] - COUNSELOR_SIGNAL_SORT[b.signal]))
        }
      } catch {
        if (!cancelled) setStudents([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchStudents()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = students
    if (activeFilter !== 'All Students') {
      list = list.filter((s) => s.signal === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [students, activeFilter, searchQuery])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading">
          Student Directory
        </h2>
        <p className="text-sm text-aurora-primary-dark/50 mt-1">
          Monitor student wellness check-ins
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 card-aurora rounded-full! py-2.5! px-4!">
        <Search className="w-[18px] h-[18px] text-aurora-primary-dark/40 shrink-0" />
        <input
          type="text"
          placeholder="Search name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-aurora-primary-dark placeholder:text-aurora-primary-dark/40 outline-none"
          aria-label="Search students"
        />
      </div>

      {/* Signal Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              activeFilter === f.value
                ? 'bg-aurora-secondary-blue text-white border-aurora-secondary-blue'
                : 'bg-white border-aurora-gray-200 text-aurora-primary-dark/60 hover:border-aurora-secondary-blue/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-aurora-primary-dark/50 text-sm">No students found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((student) => (
            <StudentRow key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}