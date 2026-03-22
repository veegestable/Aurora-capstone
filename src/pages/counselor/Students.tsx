import { useState, useEffect, useMemo } from 'react'
import { counselorService } from '../../services/counselor'
import { firestoreService } from '../../services/firebase-firestore'
import { Search } from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import type { RiskLevel } from '../../types/risk.types'
import { formatTimeAgo, deriveRiskLevel, getStudentRiskStyle } from '../../utils/riskHelpers'

type ProgramFilter = 'All Students' | 'BSCS' | 'BSIT' | 'BSIS'

interface StudentEntry {
  id: string
  full_name: string
  email: string
  department?: string
  year_level?: string
  riskLevel: RiskLevel
  moodEmoji: string
  lastLog: string
}

const MOOD_EMOJIS: Record<RiskLevel, string> = {
  'HIGH RISK': '😢',
  'MEDIUM RISK': '😐',
  'LOW RISK': '😊',
}

const FILTERS: ProgramFilter[] = ['All Students', 'BSCS', 'BSIT', 'BSIS']

// Student Card 
function StudentCard({ student }: { student: StudentEntry }) {
  const style = getStudentRiskStyle(student.riskLevel)
  return (
    <div
      className={`flex items-center card-aurora border-l-4 ${style.border} p-0 overflow-hidden`}
    >
      {/* Avatar */}
      <div className={`p-3 pl-4`}>
        <div className={`rounded-full ring-2 ${style.ring}`}>
          <LetterAvatar name={student.full_name} size={52} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 py-3 min-w-0">
        <p className="font-bold text-aurora-primary-dark text-sm truncate">
          {student.full_name}
        </p>
        <p className="text-[11px] font-bold tracking-wide text-aurora-primary-dark/50 mt-0.5">
          {student.email}
        </p>
        <div className="flex items-center justify-between mt-2 pr-2">
          <span
            className={`text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-lg border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
          >
            {student.riskLevel}
          </span>
          <span className="text-aurora-primary-dark/40 text-[11px]">
            Last log: {student.lastLog}
          </span>
        </div>
      </div>

      {/* Mood Emoji */}
      <span className="text-xl mr-4 shrink-0">{student.moodEmoji}</span>
    </div>
  )
}

// Filter Chip 
function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border-[1.5px] transition-colors shrink-0 cursor-pointer ${
        isActive
          ? 'bg-aurora-secondary-blue border-aurora-secondary-blue text-white'
          : 'bg-transparent border-aurora-primary-light/30 text-aurora-primary-dark/60 hover:border-aurora-primary-dark/30'
      }`}
      aria-label={`Filter by ${label}`}
    >
      {label}
    </button>
  )
}

// Main 
export default function Students() {
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ProgramFilter>('All Students')

  useEffect(() => {
    let cancelled = false

    async function fetchStudents() {
      try {
        const raw = await counselorService.getStudents()
        if (cancelled) return

        const mapped: StudentEntry[] = await Promise.all(
          raw.map(async (s) => {
            let lastLog = 'No logs'
            let riskLevel: RiskLevel = 'LOW RISK'
            try {
              const logs = await firestoreService.getMoodLogs(s.id)
              const latest = logs[0]
              if (latest?.log_date) {
                lastLog = formatTimeAgo(new Date(latest.log_date))
                riskLevel = deriveRiskLevel(latest?.stress_level, latest?.energy_level)
              }
            } catch {
              /* use fallbacks */
            }
            return {
              id: s.id,
              full_name: s.full_name || 'Student',
              email: s.email,
              riskLevel,
              moodEmoji: MOOD_EMOJIS[riskLevel],
              lastLog,
            }
          })
        )

        if (!cancelled) setStudents(mapped)
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
      list = list.filter(
        (s) => s.email?.toUpperCase().includes(activeFilter)
      )
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
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading">
          Student Directory
        </h2>
        <p className="text-sm text-aurora-primary-dark/50 mt-1">
          Manage and monitor student wellness
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

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f}
            isActive={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          />
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
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}