import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  Megaphone,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  School,
  MessageSquare,
} from 'lucide-react'
import { LetterAvatar } from '../components/LetterAvatar'
import { SignOutConfirmModal } from '../components/common/SignOutConfirmModal'
import { AnnouncementGuideModal } from '../components/announcements/AnnouncementGuideModal'

/** Matches mobile admin tab bar: Home, Analytics, Counselors, Settings */
const TAB_NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/counselors', label: 'Counselors', icon: Users },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

/** Stack / quick-action routes (mobile parity) */
const TOOLS_NAV = [
  { path: '/admin/students', label: 'Students', icon: GraduationCap },
  { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/admin/college-shifts', label: 'College change requests', icon: School },
  { path: '/admin/messaging-repair', label: 'Repair message tags', icon: MessageSquare },
  { path: '/admin/audit-logs', label: 'Activity timeline', icon: ScrollText },
  { path: '/admin/resources', label: 'Resources', icon: BookOpen },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `w-full flex items-center space-x-3 px-4 py-3 rounded-[14px] text-left font-semibold transition-all ${
    isActive
      ? 'bg-[rgba(45,107,255,0.2)] border border-[rgba(45,107,255,0.35)] text-[#2D6BFF]'
      : 'text-aurora-text-sec hover:text-white hover:bg-white/5 cursor-pointer'
  }`

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-aurora-bg overflow-hidden">
      <header className="bg-aurora-bg border-b border-aurora-border shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <NavLink to="/" className="flex items-center">
              <img
                src="/images/logos/logo light.png"
                alt="Aurora"
                className="h-7 w-auto"
              />
            </NavLink>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[rgba(45,107,255,0.2)] rounded-full flex items-center justify-center ring-2 ring-[rgba(45,107,255,0.35)]">
                <LetterAvatar
                  name={user?.full_name || 'A'}
                  size={32}
                  avatarUrl={user?.avatar_url ?? ''}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowSignOutModal(true)}
                className="p-2 text-aurora-text-muted hover:text-white transition-colors rounded-md hover:bg-white/5 cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-64 bg-aurora-bg border-r border-aurora-border shrink-0">
          <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                Admin
              </p>
              {TAB_NAV.map(({ path, label, icon: Icon }) => (
                <NavLink key={path} to={path} end={path === '/'} className={navLinkClass}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                Tools
              </p>
              {TOOLS_NAV.map(({ path, label, icon: Icon }) =>
                label === 'Announcements' ? (
                  <div
                    key={path}
                    className="w-full flex items-center gap-1 px-2 py-1 rounded-[14px] hover:bg-white/5"
                  >
                    <NavLink
                      to={path}
                      className={({ isActive }) =>
                        `flex-1 flex items-center space-x-3 px-2 py-2 rounded-[12px] text-left font-semibold transition-all ${
                          isActive
                            ? 'bg-[rgba(45,107,255,0.2)] border border-[rgba(45,107,255,0.35)] text-[#2D6BFF]'
                            : 'text-aurora-text-sec hover:text-white cursor-pointer'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                    <AnnouncementGuideModal
                      audience="admin"
                      iconClassName="w-4 h-4 text-aurora-text-muted"
                    />
                  </div>
                ) : (
                  <NavLink key={path} to={path} className={navLinkClass}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ),
              )}
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-hidden pb-[100px] lg:pb-0 bg-aurora-bg">
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-5 py-5 lg:px-6 lg:py-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile — floating glass tab bar (mobile admin parity) */}
      <nav
        className="lg:hidden fixed z-50 left-5 right-5 bottom-5 h-[72px] rounded-[36px] border border-white/16 bg-[rgba(7,10,46,0.72)] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
        aria-label="Admin navigation"
      >
        <div className="flex h-full items-center justify-around px-1">
          {TAB_NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-0 flex-1 py-1 transition-colors ${
                  isActive ? 'text-aurora-blue' : 'text-aurora-text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-[22px] h-[22px] ${isActive ? 'text-aurora-blue' : ''}`} />
                  <span
                    className={`text-[10px] font-semibold mt-1 truncate max-w-full px-0.5 ${
                      isActive ? 'text-aurora-blue' : ''
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <SignOutConfirmModal
        visible={showSignOutModal}
        onStay={() => setShowSignOutModal(false)}
        onLeave={handleSignOut}
        leaving={isSigningOut}
      />
    </div>
  )
}
