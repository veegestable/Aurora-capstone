import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counselorService } from '../services/counselor'
import { sessionsService } from '../services/sessions'
import { LetterAvatar } from '../components/LetterAvatar'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import { AnnouncementFormModal } from '../components/announcements/AnnouncementFormModal'
import { CounselorSessionsPane } from '../components/counselor/CounselorSessionsPane'
import { Users, CalendarClock, ChevronRight, Plus } from 'lucide-react'
import type { StudentInfo } from '../services/counselor'

interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
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

function StudentChip({ student }: { student: StudentInfo }) {
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
        <p className="text-sm font-bold text-white truncate">
          {student.full_name || 'Student'}
        </p>
        <p className="text-[11px] text-aurora-text-muted truncate">{student.email}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-aurora-text-muted shrink-0" />
    </Link>
  )
}

export default function CounselorDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentInfo[]>([])
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
          counselorService.getStudents(),
          sessionsService.getSessionsForCounselor(user.id),
        ])
        if (cancelled) return
        setStudents(studentList)
        setUpcomingCount(sessions.filter(s => s.status === 'confirmed').length)
      } catch (e) {
        console.error('Error fetching counselor dashboard data:', e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="space-y-6">
      {/* Welcome row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
            Counselor Portal
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Hello, {firstName}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSessionsPane(true)}
          aria-label="Open sessions pane"
          className="shrink-0 w-11 h-11 rounded-2xl bg-aurora-blue/15 hover:bg-aurora-blue/25
                     border border-aurora-blue/35 flex items-center justify-center cursor-pointer
                     transition-colors"
        >
          <CalendarClock className="w-5 h-5 text-aurora-blue" />
        </button>
      </div>

      {/* Dashboard Overview */}
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
            count={isLoading ? '…' : students.length}
            label="Total Students"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-aurora-green/15 flex items-center justify-center">
                <CalendarClock className="w-[18px] h-[18px] text-aurora-green" />
              </div>
            }
            count={isLoading ? '…' : upcomingCount}
            label="Upcoming Accepted Sessions"
          />
        </div>
      </section>

      {/* Students */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            Students
          </h3>
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
        ) : students.length === 0 ? (
          <div className="card-aurora text-center py-10">
            <Users className="w-10 h-10 text-aurora-primary-dark/20 mx-auto mb-2" />
            <p className="text-sm text-aurora-text-sec">No students yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {students.slice(0, 6).map(s => (
              <StudentChip key={s.id} student={s} />
            ))}
          </div>
        )}
      </section>

      {/* Announcements */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            Announcements
          </h3>
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

      {/* Modals */}
      <CounselorSessionsPane
        visible={showSessionsPane}
        counselorId={user?.id ?? ''}
        onClose={() => setShowSessionsPane(false)}
      />

      <AnnouncementFormModal
        open={showAddAnnouncement}
        onClose={() => setShowAddAnnouncement(false)}
        onSuccess={() => setShowAddAnnouncement(false)}
      />
    </div>
  )
}