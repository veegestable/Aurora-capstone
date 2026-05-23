import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counselorService } from '../services/counselor'
import { sessionsService } from '../services/sessions'
import { userSettingsService } from '../services/user-settings'
import { counselorCheckInContextService } from '../services/counselor-checkin-context'
import { LetterAvatar } from '../components/LetterAvatar'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import { AnnouncementFormModal } from '../components/announcements/AnnouncementFormModal'
import { AnnouncementGuideModal } from '../components/announcements/AnnouncementGuideModal'
import { CounselorSessionsPane } from '../components/counselor/CounselorSessionsPane'
import { Users, CalendarClock, ChevronRight, Plus } from 'lucide-react'
import {
  type CounselorStudentRosterPill,
  COUNSELOR_ROSTER_PILL_LABEL,
  COUNSELOR_ROSTER_PILL_SORT,
} from '../constants/counselor/counselor-student-roster-pills'
import { formatCounselorStudentSubtitle } from '../constants/student/programs'
import { formatTimeAgo } from '../utils/formatters'
import type { StudentInfo } from '../services/counselor'

interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
}

interface RosterPreviewStudent {
  id: string
  full_name: string
  programLine: string
  activityLine: string
  rosterPill: CounselorStudentRosterPill
  avatar_url?: string
}

function StatCard({ icon, count, label }: StatCardProps) {
  return (
    <div className="card-aurora flex flex-col gap-2 p-5 min-h-[120px]">
      {icon}
      <span className="text-3xl font-extrabold text-aurora-primary-dark tracking-tight">
        {count}
      </span>
      <span className="text-xs text-aurora-primary-dark/60">{label}</span>
    </div>
  )
}

function StudentChip({ student }: { student: RosterPreviewStudent }) {
  const pillStyle =
    student.rosterPill === 'session_started'
      ? 'bg-aurora-blue/15 border-aurora-blue/30 text-aurora-blue'
      : 'bg-slate-500/10 border-slate-500/20 text-aurora-text-sec'

  return (
    <Link
      to={`/counselor/students/${student.id}`}
      className="flex items-center gap-3 card-aurora p-3 hover:border-aurora-blue/40 transition-colors"
      aria-label={`Open ${student.full_name}'s profile`}
    >
      <LetterAvatar
        name={student.full_name || 'Student'}
        size={40}
        avatarUrl={student.avatar_url}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{student.full_name || 'Student'}</p>
        <p className="text-[11px] text-aurora-text-muted truncate">{student.programLine}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span
            className={`text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-lg border ${pillStyle}`}
          >
            {COUNSELOR_ROSTER_PILL_LABEL[student.rosterPill]}
          </span>
          <span className="text-[10px] text-aurora-text-muted truncate">{student.activityLine}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-aurora-text-muted shrink-0" />
    </Link>
  )
}

export default function CounselorDashboard() {
  const { user } = useAuth()
  const [studentCount, setStudentCount] = useState(0)
  const [rosterPreview, setRosterPreview] = useState<RosterPreviewStudent[]>([])
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [showSessionsPane, setShowSessionsPane] = useState(false)
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const firstName = user?.full_name?.split(' ')[0] || 'Counselor'

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      try {
        const [studentList, sessions] = await Promise.all([
          counselorService.getStudentsForCounselor(user.id, {
            activeCollegeCode: user.college_code,
          }),
          sessionsService.getSessionsForCounselor(user.id),
        ])
        if (cancelled) return

        setStudentCount(studentList.length)
        setUpcomingCount(sessions.filter((s) => s.status === 'confirmed').length)

        const limit = Math.min(6, studentList.length)
        const previewRows = await Promise.all(
          studentList.slice(0, limit).map(async (s: StudentInfo) => {
            let rosterPill: CounselorStudentRosterPill = 'no_session_yet'
            let activityLine = 'No session with you yet'
            try {
              const settings = await userSettingsService.getUserSettings(s.id)
              const sessionStarted =
                settings?.counselorJournalAccess?.[user.id] === true
              if (sessionStarted) {
                rosterPill = 'session_started'
                const { logs } = await counselorCheckInContextService.fetchStudentCheckInContext(s.id)
                const latest = logs[0]
                activityLine = latest?.log_date
                  ? formatTimeAgo(new Date(latest.log_date))
                  : 'No Aurora entries yet'
              }
            } catch {
              /* keep defaults */
            }
            return {
              id: s.id,
              full_name: s.full_name || 'Student',
              programLine:
                formatCounselorStudentSubtitle({
                  college_code: s.college_code,
                  department: s.department,
                  program: s.program,
                  year_level: s.year_level ?? s.yearLevel,
                }) || 'CCS',
              activityLine,
              rosterPill,
              avatar_url: s.avatar_url,
            }
          }),
        )

        if (!cancelled) {
          setRosterPreview(
            previewRows.sort(
              (a, b) =>
                COUNSELOR_ROSTER_PILL_SORT[a.rosterPill] - COUNSELOR_ROSTER_PILL_SORT[b.rosterPill],
            ),
          )
        }
      } catch (e) {
        console.error('Error fetching counselor dashboard data:', e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [user?.id, user?.college_code])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
            COUNSELOR PORTAL
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Hello, {firstName}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSessionsPane(true)}
          aria-label="Sessions overview"
          className="shrink-0 w-11 h-11 rounded-2xl bg-aurora-blue/15 hover:bg-aurora-blue/25
                     border border-aurora-blue/35 flex items-center justify-center cursor-pointer
                     transition-colors"
        >
          <CalendarClock className="w-5 h-5 text-aurora-blue" />
        </button>
      </div>

      <section>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">
          Dashboard Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/15 flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-aurora-secondary-blue" />
              </div>
            }
            count={isLoading ? '…' : studentCount}
            label="Total Students"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-aurora-green/15 flex items-center justify-center">
                <CalendarClock className="w-[18px] h-[18px] text-aurora-green" />
              </div>
            }
            count={isLoading ? '…' : upcomingCount}
            label="Upcoming Sessions"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">Students</h3>
          <Link
            to="/counselor/students"
            className="flex items-center gap-1 text-aurora-secondary-blue text-xs font-bold hover:underline"
          >
            VIEW ALL
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="card-aurora flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-aurora-secondary-blue" />
          </div>
        ) : rosterPreview.length === 0 ? (
          <div className="card-aurora text-center py-10">
            <Users className="w-10 h-10 text-aurora-primary-dark/20 mx-auto mb-2" />
            <p className="text-sm text-aurora-text-sec">No students to show here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rosterPreview.map((s) => (
              <StudentChip key={s.id} student={s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
              Announcements
            </h3>
            <AnnouncementGuideModal audience="counselor" />
          </div>
          <button
            type="button"
            onClick={() => setShowAddAnnouncement(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                       border border-aurora-blue/40 bg-aurora-blue/15 text-aurora-blue
                       hover:bg-aurora-blue/25 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        <AnnouncementBanner role="counselor" />
      </section>

      <CounselorSessionsPane
        visible={showSessionsPane}
        counselorId={user?.id ?? ''}
        onClose={() => setShowSessionsPane(false)}
      />

      <AnnouncementFormModal
        open={showAddAnnouncement}
        onClose={() => setShowAddAnnouncement(false)}
      />
    </div>
  )
}
