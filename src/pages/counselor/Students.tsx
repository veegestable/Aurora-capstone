import { useState, useEffect, useMemo } from 'react'
import { counselorService } from '../../services/counselor'
import { firestoreService } from '../../services/firebase-firestore'
import { Search } from 'lucide-react'
import type { RiskLevel } from '../../types/risk.types'
import { formatTimeAgo, deriveRiskLevel } from '../../utils/riskHelpers'
import { StudentCard, StudentEntry } from '../../components/counselor/StudentCard'
import { FilterChip } from '../../components/counselor/FilterChip'

type ProgramFilter = 'All Students' | 'BSCS' | 'BSIT' | 'BSIS'

const MOOD_EMOJIS: Record<RiskLevel, string> = {
  'HIGH RISK': '😢',
  'MEDIUM RISK': '😐',
  'LOW RISK': '😊',
}

const FILTERS: ProgramFilter[] = ['All Students', 'BSCS', 'BSIT', 'BSIS']

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