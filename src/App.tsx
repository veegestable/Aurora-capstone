import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import PendingCounselor from './pages/PendingCounselor'
import Settings from './pages/Settings'
import StudentLayout from './layouts/StudentLayout'
import StudentDashboard from './pages/StudentDashboard'
import History from './pages/student/History'
import Messages from './pages/student/Messages'
import StudentProfile from './pages/student/Profile'
import StudentResources from './pages/student/Resources'
import CounselorLayout from './layouts/CounselorLayout'
import CounselorDashboard from './pages/CounselorDashboard'
import CounselorStudents from './pages/counselor/Students'
import CounselorStudentDetail from './pages/counselor/StudentDetail'
import CounselorRiskCenter from './pages/counselor/RiskCenter'
import CounselorMessages from './pages/counselor/Messages'
import CounselorProfile from './pages/counselor/Profile'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCounselors from './pages/admin/Counselors'
import AdminStudents from './pages/admin/Students'
import AdminResources from './pages/admin/Resources'
import AdminAnnouncements from './pages/admin/Announcements'
import AdminAnalytics from './pages/admin/Analytics'
import AdminAuditLogs from './pages/admin/AuditLogs'
import AdminSettings from './pages/admin/Settings'
import AdminCounselorDetail from './pages/admin/CounselorDetail'
import AdminStudentDetail from './pages/admin/StudentDetail'
import AdminResourceDetail from './pages/admin/ResourceDetail'

import MoodCheckIn from './components/MoodCheckIn'
import MoodCalendar from './components/MoodCalendar'
import Analytics from './components/Analytics'
import ScheduleManager from './components/ScheduleManager'
import NotificationPanel from './components/NotificationPanel'
import LoadingScreen from './components/LoadingScreen'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route index element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    )
  }

  if (user.role === 'counselor' && user.approval_status === 'pending') {
    return (
      <Router>
        <PendingCounselor />
      </Router>
    )
  }

  return (
    <Router>
      {user.role === 'student' ? (
        <Routes>
          <Route element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="mood" element={<MoodCheckIn />} />
            <Route path="calendar" element={<MoodCalendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="schedule" element={<ScheduleManager />} />
            <Route path="notifications" element={<NotificationPanel />} />
            <Route path="student/history" element={<History />} />
            <Route path="student/messages" element={<Messages />} />
            <Route path="student/profile" element={<StudentProfile />} />
            <Route path="student/resources" element={<StudentResources />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : user.role === 'admin' ? (
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="admin/counselors" element={<AdminCounselors />} />
            <Route path="admin/counselors/:id" element={<AdminCounselorDetail />} />
            <Route path="admin/students" element={<AdminStudents />} />
            <Route path="admin/students/:id" element={<AdminStudentDetail />} />
            <Route path="admin/resources" element={<AdminResources />} />
            <Route path="admin/resources/:id" element={<AdminResourceDetail />} />
            <Route path="admin/announcements" element={<AdminAnnouncements />} />
            <Route path="admin/analytics" element={<AdminAnalytics />} />
            <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route element={<CounselorLayout />}>
            <Route index element={<CounselorDashboard />} />
            <Route path="counselor/students" element={<CounselorStudents />} />
            <Route path="counselor/students/:id" element={<CounselorStudentDetail />} />
            <Route path="counselor/risk-center" element={<CounselorRiskCenter />} />
            <Route path="counselor/messages" element={<CounselorMessages />} />
            <Route path="counselor/profile" element={<CounselorProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </Router>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}