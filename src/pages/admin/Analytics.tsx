import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2,
  Users,
  GraduationCap,
  Clock,
  LogIn,
  LogOut,
  Smartphone,
  Send,
  RefreshCw,
} from 'lucide-react'
import { adminService } from '../../services/admin'
import { auditLogsService } from '../../services/audit-logs'
import type { EngagementSnapshot7d } from '../../types/audit.types'
import type { CollegeRosterCountsSnapshot } from '../../utils/admin/collegeRosterCounts'
import { StatCard } from '../../components/admin/StatCard'
import { CollegeCountBarChart } from '../../components/admin/CollegeCountBarChart'
import { CollegeProgramAnalytics } from '../../components/admin/CollegeProgramAnalytics'
import { EngagementActionCard } from '../../components/admin/EngagementActionCard'
import { isCounselorPendingApproval } from '../../utils/counselorApprovalForAdmin'

const ACTION_ROWS = [
  { key: 'user_login' as const, label: 'Sign-ins', icon: LogIn },
  { key: 'user_logout' as const, label: 'Sign-outs', icon: LogOut },
  { key: 'app_active' as const, label: 'App opens / active', icon: Smartphone },
  { key: 'message_sent' as const, label: 'Chat messages sent', icon: Send },
]

const COLLEGE_LEGEND =
  'COE Engineering · CSM Science & Math · CCS Computer Studies · CED Education · CASS Arts & Social Sciences · CEBA Economics, Business & Accountancy · CHS Health Services'

function sumRoles(c: {
  counselor: number
  student: number
  admin: number
  other: number
}): number {
  return c.counselor + c.student + c.admin + c.other
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [engagement, setEngagement] = useState<EngagementSnapshot7d | null>(null)
  const [counselorCount, setCounselorCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [collegeRoster, setCollegeRoster] = useState<CollegeRosterCountsSnapshot | null>(null)

  const load = useCallback(async (isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      const [snap, counselors, students, rosterByCollege] = await Promise.all([
        auditLogsService.getEngagementSnapshotLastDays(7, 2000),
        adminService.getCounselors(),
        adminService.getStudents(),
        adminService.getCollegeRosterCounts(),
      ])
      setEngagement(snap)
      setCollegeRoster(rosterByCollege)
      setCounselorCount(counselors.length)
      setStudentCount(students.length)
      setPendingCount(
        counselors.filter((c) =>
          isCounselorPendingApproval(c as unknown as Record<string, unknown>),
        ).length,
      )
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const windowLabel =
    engagement?.windowStart && engagement?.windowEnd
      ? `${engagement.windowStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} – ${engagement.windowEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      : ''

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—'

  const capped = engagement != null && engagement.fetchedRowCount >= 2000

  const totalTracked7d =
    engagement == null
      ? null
      : ACTION_ROWS.reduce((acc, { key }) => acc + sumRoles(engagement.byAction[key]), 0)

  return (
    <div className="space-y-5 max-w-3xl lg:max-w-none">
      <div className="flex items-start gap-2.5 pb-4 border-b border-aurora-border">
        <BarChart2 className="w-[22px] h-[22px] text-aurora-blue shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold text-white">Analytics</h2>
          <p className="text-xs text-aurora-text-sec mt-1 leading-relaxed">
            Engagement (audit trail) + roster — no mood data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="p-2 text-aurora-blue hover:bg-aurora-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh analytics"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-aurora-border border-t-aurora-blue" />
        </div>
      ) : error ? (
        <p className="text-sm text-aurora-red">{error}</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-aurora-text-muted">
            Last updated: {updatedLabel}
          </p>

          <section>
            <h3 className="text-base font-extrabold text-white mb-2.5">Roster</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard
                icon={
                  <div className="w-9 h-9 rounded-full bg-aurora-blue/20 flex items-center justify-center">
                    <Users className="w-[18px] h-[18px] text-aurora-blue" />
                  </div>
                }
                count={counselorCount}
                label="Counselors"
              />
              <StatCard
                icon={
                  <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                    <GraduationCap className="w-[18px] h-[18px] text-aurora-green" />
                  </div>
                }
                count={studentCount}
                label="Students"
              />
              <StatCard
                icon={
                  <div className="w-9 h-9 rounded-full bg-aurora-amber/20 flex items-center justify-center">
                    <Clock className="w-[18px] h-[18px] text-aurora-amber" />
                  </div>
                }
                count={pendingCount}
                label="Pending approvals"
                accent={pendingCount > 0}
              />
              <StatCard
                icon={
                  <div className="w-9 h-9 rounded-full bg-aurora-purple/25 flex items-center justify-center">
                    <BarChart2 className="w-[18px] h-[18px] text-aurora-purple" />
                  </div>
                }
                count={totalTracked7d === null ? '—' : totalTracked7d}
                label="Tracked events (7d)"
              />
            </div>
          </section>

          {collegeRoster ? (
            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-white">Roster by college</h3>
              <p className="text-[11px] text-aurora-text-muted leading-relaxed">
                COE, CSM, CCS, CED, CASS, CEBA, CHS — scroll charts if needed.
                {collegeRoster.unassignedStudents > 0
                  ? ` ${collegeRoster.unassignedStudents} student(s) have no college set.`
                  : ''}
              </p>
              <CollegeCountBarChart
                title="Students per college"
                caption="All active student accounts grouped by college code."
                points={collegeRoster.studentsByCollege}
                barClassName="bg-aurora-green"
              />
              <CollegeCountBarChart
                title="Special population per college"
                caption={`${collegeRoster.totalSpecialPopulation} student(s) have guidance session consent with at least one counselor (journal access granted).`}
                points={collegeRoster.specialPopulationByCollege}
                barClassName="bg-aurora-purple"
                emptyHint="No students in special population yet."
              />
              <p className="text-[11px] text-aurora-text-muted leading-relaxed">{COLLEGE_LEGEND}</p>
              <CollegeProgramAnalytics roster={collegeRoster} />
            </section>
          ) : null}

          <section>
            <h3 className="text-base font-extrabold text-white mt-2">Last 7 days — engagement</h3>
            <p className="text-sm text-aurora-text-sec mt-1">{windowLabel}</p>
            {engagement ? (
              <p className="text-[11px] text-aurora-text-muted mt-1 leading-relaxed">
                {engagement.eventsInWindow} audit rows in date window · scanned{' '}
                {engagement.fetchedRowCount} newest rows from Firestore
              </p>
            ) : null}
            {capped ? (
              <p className="text-[11px] text-aurora-amber mt-2 leading-relaxed">
                Fetch limit reached (2000 rows). Totals may miss older events in this week — see{' '}
                <Link to="/admin/audit-logs" className="underline text-aurora-blue">
                  Activity timeline
                </Link>{' '}
                for raw stream.
              </p>
            ) : null}

            {engagement
              ? ACTION_ROWS.map(({ key, label, icon }) => (
                  <EngagementActionCard
                    key={key}
                    label={label}
                    icon={icon}
                    counts={engagement.byAction[key]}
                  />
                ))
              : null}

            <p className="text-[11px] text-aurora-text-muted mt-4 leading-relaxed">
              Based on audit log actions only. Roles come from each event&apos;s performer.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
