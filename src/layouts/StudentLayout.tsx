import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Home, CalendarDays, MessageSquare, BookOpen,
  User, Heart, BarChart3, Calendar,
  Bell, LogOut,
} from 'lucide-react'
import logoLight from '../assets/logos/logo light.png'

const PRIMARY_NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/student/history', label: 'History', icon: CalendarDays },
  { path: '/student/messages', label: 'Messages', icon: MessageSquare },
  { path: '/student/resources', label: 'Resources', icon: BookOpen },
  { path: '/student/profile', label: 'Profile', icon: User },
]

const SECONDARY_NAV = [
  { path: '/mood', label: 'Mood Check-in', icon: Heart },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/notifications', label: 'Notifications', icon: Bell },
]

function NavItem({ path, label, icon: Icon, end }: { path: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={path}
      end={end}
      className={({ isActive }) =>
        `w-full flex items-center space-x-3 px-4 py-2.5 rounded-[14px] text-left font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[rgba(45,107,255,0.15)] border border-[rgba(45,107,255,0.3)] text-aurora-blue shadow-[0_0_20px_rgba(45,107,255,0.15)]'
            : 'text-aurora-text-sec hover:text-white hover:bg-white/5 cursor-pointer'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isActive ? 'bg-[rgba(45,107,255,0.2)]' : 'bg-white/5'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function StudentLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col bg-aurora-bg overflow-hidden">
      {/* Header */}
      <header className="bg-aurora-card/50 backdrop-blur-xl border-b border-white/6 shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <NavLink to="/" className="flex items-center space-x-3 group">
              <img
                src={logoLight}
                alt="Aurora Mental Health Platform"
                className="h-6 sm:h-8 w-auto transition-transform duration-300 group-hover:scale-105"
              />
              <h1 className="text-lg sm:text-xl font-bold text-white hidden xs:block">
                Aurora
              </h1>
            </NavLink>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-linear-to-br from-aurora-blue to-aurora-purple rounded-full flex items-center justify-center ring-2 ring-white/10 shadow-[0_0_15px_rgba(45,107,255,0.25)]">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-aurora-blue to-aurora-purple flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-bold">
                        {user?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-aurora-text-sec hidden sm:block">
                  Welcome, {user?.full_name}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 sm:space-x-2 text-aurora-text-muted cursor-pointer hover:text-white transition-all px-2.5 sm:px-3 py-2 rounded-[10px] hover:bg-white/5"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white/2 backdrop-blur-sm border-r border-white/6 shrink-0">
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                Main
              </p>
              {PRIMARY_NAV.map(({ path, label, icon }) => (
                <NavItem key={path} path={path} label={label} icon={icon} end={path === '/'} />
              ))}
            </div>

            <div className="px-4">
              <div className="border-t border-white/6" />
            </div>

            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-3">
                Tools
              </p>
              {SECONDARY_NAV.map(({ path, label, icon }) => (
                <NavItem key={path} path={path} label={label} icon={icon} />
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden pb-20 lg:pb-0">
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-aurora-bg/90 backdrop-blur-xl border-t border-white/6 z-50">
        <div className="flex justify-around items-center py-2">
          {PRIMARY_NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-all ${
                  isActive ? 'text-aurora-blue' : 'text-aurora-text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg mb-0.5 transition-colors ${isActive ? 'bg-[rgba(45,107,255,0.15)]' : ''}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-aurora-blue' : 'text-aurora-text-muted'}`} />
                  </div>
                  <span className={`text-[10px] font-semibold truncate ${isActive ? 'text-aurora-blue' : 'text-aurora-text-muted'}`}>
                    {label.split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}