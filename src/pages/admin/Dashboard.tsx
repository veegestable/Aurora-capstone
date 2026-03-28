import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'
import { Users, GraduationCap, Clock, Megaphone, ChevronRight } from 'lucide-react'
import { StatCard } from '../../components/admin/StatCard'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [counselorCount, setCounselorCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const firstName = user?.full_name?.split(' ')[0] || 'Admin'

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [counselors, students] = await Promise.all([
          adminService.getCounselors(),
          adminService.getStudents(),
        ])
        if (cancelled) return
        setCounselorCount(counselors.length)
        setStudentCount(students.length)
        setPendingCount(counselors.filter(c => c.approval_status === 'pending').length)
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const quickLinks = [
    { to: '/admin/counselors', label: 'Counselors', description: 'Review and approve counselor signups', icon: Users, color: 'bg-aurora-secondary-blue/15', iconColor: 'text-aurora-secondary-blue' },
    { to: '/admin/students', label: 'Students', description: 'Manage CCS student records', icon: GraduationCap, color: 'bg-green-500/15', iconColor: 'text-green-500' },
    { to: '/admin/announcements', label: 'Announcements', description: 'Publish updates to counselors and students', icon: Megaphone, color: 'bg-amber-500/15', iconColor: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
          Admin Portal
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
          Hello, {firstName}
        </h2>
      </div>

      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">Overview</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
            <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/15 flex items-center justify-center"><Users className="w-[18px] h-[18px] text-aurora-secondary-blue" /></div>}
              count={counselorCount}
              label="Total Counselors"
            />
            <StatCard
              icon={<div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center"><GraduationCap className="w-[18px] h-[18px] text-green-500" /></div>}
              count={studentCount}
              label="Total Students"
            />
            <StatCard
              icon={<div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center"><Clock className="w-[18px] h-[18px] text-amber-500" /></div>}
              count={pendingCount}
              label="Pending Approvals"
              accent={pendingCount > 0 ? 'ring-1 ring-amber-500/20' : ''}
            />
            <StatCard
              icon={<div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center"><Megaphone className="w-[18px] h-[18px] text-purple-500" /></div>}
              count="—"
              label="Announcements"
            />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">Quick Actions</h3>
        <div className="space-y-3">
          {quickLinks.map(({ to, label, description, icon: Icon, color, iconColor }) => (
            <Link
              key={to}
              to={to}
              className="card-aurora flex items-center p-4 hover:shadow-lg transition-shadow"
              aria-label={`Go to ${label}`}
            >
              <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div className="flex-1 ml-4">
                <p className="font-bold text-aurora-primary-dark text-sm">{label}</p>
                <p className="text-xs text-aurora-primary-dark/50 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-aurora-primary-dark/30 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}