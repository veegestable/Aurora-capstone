import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { counselorService } from '../../services/counselor'
import { counselorCheckInContextService } from '../../services/counselor-checkin-context'
import { userSettingsService } from '../../services/user-settings'
import { Search } from 'lucide-react'
import {
  type CounselorStudentRosterPill,
  COUNSELOR_ROSTER_PILL_LABEL,
  COUNSELOR_ROSTER_PILL_SORT,
} from '../../constants/counselor/counselor-student-roster-pills'
import { formatCounselorStudentSubtitle } from '../../constants/student/programs'
import { formatTimeAgo } from '../../utils/formatters'
import { LetterAvatar } from '../../components/LetterAvatar'
import { useAuth } from '../../contexts/AuthContext'

interface StudentEntry {
  id: string
  full_name: string
  college_code?: string
  department?: string
  program?: string
  year_level?: string
  avatar_url?: string
  rosterPill: CounselorStudentRosterPill
  activitySummary: string
}

type DirectoryFilter = 'all' | 'special_population'

const DIRECTORY_FILTERS: Array<{ key: DirectoryFilter; label: string }> = [
  { key: 'all', label: 'All Students' },
  { key: 'special_population', label: 'In Session' },
]

function isSpecialPopulationStudent(student: StudentEntry): boolean {
  return student.rosterPill === 'session_started'
}

function getRosterPillStyle(pill: CounselorStudentRosterPill) {
  switch (pill) {
    case 'session_started':
      return {
        badgeBg: 'bg-aurora-blue/15',
        badgeBorder: 'border-aurora-blue/30',
        text: 'text-aurora-blue',
      }
    case 'no_session_yet':
      return {
        badgeBg: 'bg-slate-500/10',
        badgeBorder: 'border-slate-500/20',
        text: 'text-aurora-text-sec',
      }
  }
}

function StudentRow({ student, onClick }: { student: StudentEntry; onClick: () => void }) {
  const style = getRosterPillStyle(student.rosterPill)
  const programText =
    formatCounselorStudentSubtitle({
      college_code: student.college_code,
      department: student.department,
      program: student.program,
      year_level: student.year_level,
    }) || 'CCS'

  return (
    <div
      onClick={onClick}
      className="flex items-center card-aurora p-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      aria-label={`View details for ${student.full_name}`}
    >
      <div className="p-3 pl-4">
        <LetterAvatar name={student.full_name} size={44} avatarUrl={student.avatar_url} />
      </div>
      <div className="flex-1 py-3 min-w-0 pr-2">
        <p className="font-bold text-aurora-primary-dark text-sm truncate">{student.full_name}</p>
        <p className="text-[11px] font-bold text-aurora-primary-dark/50 tracking-wide truncate mt-0.5">
          {programText}
        </p>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span
            className={`inline-block text-[10px] font-extrabold tracking-wide px-2 py-1 rounded-lg border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
          >
            {COUNSELOR_ROSTER_PILL_LABEL[student.rosterPill]}
          </span>
          <span className="text-[11px] text-aurora-primary-dark/45 truncate text-right min-w-0">
            {student.activitySummary}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Students() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<DirectoryFilter>('all')

  const specialPopulationCount = useMemo(
    () => students.filter(isSpecialPopulationStudent).length,
    [students],
  )

  useEffect(() => {
    const counselorId = user?.id
    if (!counselorId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchStudents() {
      if (!counselorId) return
      try {
        const raw = await counselorService.getStudentsForCounselor(counselorId, {
          activeCollegeCode: user?.college_code,
        })
        if (cancelled) return

        const mapped: StudentEntry[] = await Promise.all(
          raw.map(async (s) => {
            const sid = s.id
            let rosterPill: CounselorStudentRosterPill = 'no_session_yet'
            let activitySummary = 'No session with you yet'
            try {
              let sessionStarted = false
              const settings = await userSettingsService.getUserSettings(sid)
              sessionStarted =
                settings?.counselorJournalAccess?.[counselorId] === true
              if (sessionStarted) {
                rosterPill = 'session_started'
                const { logs } = await counselorCheckInContextService.fetchStudentCheckInContext(sid)
                const latest = logs[0]
                if (latest?.log_date) {
                  activitySummary = `Last in Aurora: ${formatTimeAgo(new Date(latest.log_date))}`
                } else {
                  activitySummary = 'No Aurora entries in this window yet'
                }
              }
            } catch {
              rosterPill = 'no_session_yet'
              activitySummary = '—'
            }
            return {
              id: sid,
              full_name: s.full_name || 'Student',
              college_code: s.college_code,
              department: s.department,
              program: s.program,
              year_level: s.year_level ?? s.yearLevel,
              avatar_url: s.avatar_url,
              rosterPill,
              activitySummary,
            }
          }),
        )

        if (!cancelled) {
          setStudents(
            mapped.sort(
              (a, b) =>
                COUNSELOR_ROSTER_PILL_SORT[a.rosterPill] -
                COUNSELOR_ROSTER_PILL_SORT[b.rosterPill],
            ),
          )
        }
      } catch {
        if (!cancelled) setStudents([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchStudents()
    return () => { cancelled = true }
  }, [user?.id, user?.college_code])

  const filtered = useMemo(() => {
    let list = students
    if (activeFilter === 'special_population') {
      list = list.filter(isSpecialPopulationStudent)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s) => {
        const subtitle = formatCounselorStudentSubtitle({
          college_code: s.college_code,
          department: s.department,
          program: s.program,
          year_level: s.year_level,
        }).toLowerCase()
        return (
          s.full_name.toLowerCase().includes(q) ||
          subtitle.includes(q) ||
          s.college_code?.toLowerCase().includes(q) ||
          s.department?.toLowerCase().includes(q) ||
          s.program?.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [students, activeFilter, searchQuery])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading">
          Student Directory
        </h2>
        <p className="text-sm text-aurora-primary-dark/50 mt-1 max-w-xl">
          Open a student for journals &amp; analytics after they request a session with you, or
          invite them to chat
        </p>
      </div>

      <div className="flex items-center gap-2.5 card-aurora rounded-full! py-2.5! px-4!">
        <Search className="w-[18px] h-[18px] text-aurora-primary-dark/40 shrink-0" />
        <input
          type="text"
          placeholder="Search name, ID or program..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-aurora-primary-dark placeholder:text-aurora-primary-dark/40 outline-none"
          aria-label="Search students"
        />
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
        role="toolbar"
        aria-label="Filter students"
      >
        {DIRECTORY_FILTERS.map((f) => {
          const countLabel =
            f.key === 'special_population' ? ` (${specialPopulationCount})` : ''
          const active = activeFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer min-h-[36px] ${
                active
                  ? 'bg-aurora-secondary-blue text-white border-aurora-secondary-blue shadow-sm'
                  : 'bg-aurora-secondary-blue/10 border-aurora-gray-200 text-aurora-primary-dark/60 hover:border-aurora-secondary-blue/40'
              }`}
              aria-pressed={active}
            >
              {f.label}
              {countLabel}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-aurora-primary-dark/50 text-sm">
            {activeFilter === 'special_population'
              ? 'No students in your special population yet.'
              : 'No students found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onClick={() => navigate(`/counselor/students/${student.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
