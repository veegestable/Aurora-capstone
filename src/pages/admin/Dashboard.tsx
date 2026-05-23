import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'
import { announcementsService } from '../../services/announcements'
import {
  Users,
  GraduationCap,
  Clock,
  Megaphone,
  FileText,
  School,
  MessageSquare,
} from 'lucide-react'
import { StatCard } from '../../components/admin/StatCard'
import { AdminQuickActionRow } from '../../components/admin/AdminQuickActionRow'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { isCounselorPendingApproval } from '../../utils/counselorApprovalForAdmin'
import { AdminDashboardAnnouncements } from '../../components/announcements/AdminDashboardAnnouncements'

export default function AdminDashboard() {
  const { user } = useAuth()
  const firstName = user?.full_name?.split(' ')[0] || 'Admin'

  const [counselorCount, setCounselorCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [announcementCount, setAnnouncementCount] = useState<number | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOverview = useCallback(async () => {
    try {
      const [counselors, students, annCount] = await Promise.all([
        adminService.getCounselors(),
        adminService.getStudents(),
        announcementsService.countAll(),
      ])
      setCounselorCount(counselors.length)
      setStudentCount(students.length)
      setPendingCount(
        counselors.filter((c) =>
          isCounselorPendingApproval(c as unknown as Record<string, unknown>),
        ).length,
      )
      setAnnouncementCount(annCount)
    } catch (error) {
      console.error('Admin dashboard overview:', error)
    } finally {
      setOverviewLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const onRefresh = () => {
    setRefreshing(true)
    void loadOverview()
  }

  const announcementStatDisplay =
    announcementCount === null ? '—' : announcementCount

  return (
    <div className="space-y-6 max-w-3xl lg:max-w-none">
      <AdminPageHeader title={`Hello, ${firstName}`} />

      <div>
        <h3 className="text-[17px] font-extrabold text-white mb-3">Overview</h3>
        {overviewLoading ? (
          <div className="flex items-center justify-center gap-2.5 py-7">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-aurora-border border-t-aurora-blue" />
            <span className="text-sm text-aurora-text-sec">Loading…</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard
                icon={<Users className="w-[18px] h-[18px] text-aurora-blue" />}
                count={counselorCount}
                label="Total Counselors"
              />
              <StatCard
                icon={<GraduationCap className="w-[18px] h-[18px] text-aurora-green" />}
                count={studentCount}
                label="Total Students"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard
                icon={<Clock className="w-[18px] h-[18px] text-aurora-amber" />}
                count={pendingCount}
                label="Pending Approvals"
                accent={pendingCount > 0}
              />
              <StatCard
                icon={<Megaphone className="w-[18px] h-[18px] text-aurora-purple" />}
                count={announcementStatDisplay}
                label="Announcements"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[17px] font-extrabold text-white">Quick Actions</h3>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs font-semibold text-aurora-blue hover:text-aurora-blue-light disabled:opacity-50 cursor-pointer"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="space-y-2.5">
          <AdminQuickActionRow
            to="/admin/counselors"
            title="Counselors"
            description="Review and approve counselor signups"
            icon={<Users className="w-6 h-6 text-aurora-blue" />}
          />
          <AdminQuickActionRow
            to="/admin/students"
            title="Students"
            description="Read-only roster — directory fields only"
            icon={<GraduationCap className="w-6 h-6 text-aurora-green" />}
          />
          <AdminQuickActionRow
            to="/admin/college-shifts"
            title="College change requests"
            description="Approve or reject student and counselor college shifts"
            icon={<School className="w-6 h-6 text-aurora-purple" />}
          />
          <AdminQuickActionRow
            to="/admin/messaging-repair"
            title="Repair message tags"
            description="Fix inbox vs past-college after a student returns to a college"
            icon={<MessageSquare className="w-6 h-6 text-aurora-blue" />}
          />
          <AdminQuickActionRow
            to="/admin/announcements"
            title="Announcements"
            description="Publish updates to counselors and students"
            icon={<Megaphone className="w-6 h-6 text-aurora-amber" />}
          />
          <AdminQuickActionRow
            to="/admin/audit-logs"
            title="Activity timeline"
            description="Logins, app usage, and admin actions"
            icon={<FileText className="w-[22px] h-[22px] text-aurora-blue" />}
          />
        </div>
      </div>

      <AdminDashboardAnnouncements />
    </div>
  )
}
