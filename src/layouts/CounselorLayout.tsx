import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Home, Users, AlertTriangle, MessageSquare,
  User, LogOut,
} from 'lucide-react'
import logoLight from '../assets/logos/logo light.png'

// Primary nav — shown in both sidebar and mobile bottom bar
const PRIMARY_NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/counselor/students', label: 'Students', icon: Users },
  { path: '/counselor/risk-center', label: 'Risks', icon: AlertTriangle },
  { path: '/counselor/messages', label: 'Messages', icon: MessageSquare },
  { path: '/counselor/profile', label: 'Profile', icon: User },
]

export default function CounselorLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col gradient-aurora-light overflow-hidden">
      {/* Header */}
      <header className="bg-aurora-primary-dark border-b border-aurora-primary-light/20 shrink-0 z-50 shadow-aurora">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <NavLink to="/" className="flex items-center space-x-3">
              <img
                src={logoLight}
                alt="Aurora Mental Health Platform"
                className="h-6 sm:h-8 w-auto"
              />
              <h1 className="text-lg sm:text-xl font-bold text-white hidden xs:block">
                Aurora
              </h1>
            </NavLink>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 gradient-aurora-primary rounded-full flex items-center justify-center ring-2 ring-aurora-blue-500/20">
                  <span className="text-white text-xs sm:text-sm font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-white/90 hidden sm:block">
                  Welcome, {user?.full_name}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 sm:space-x-2 text-white/70 cursor-pointer hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-md hover:bg-white/10"
                aria-label="Sign out"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-aurora-primary-dark shadow-aurora shrink-0">
          <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">
                Counselor
              </p>
              {PRIMARY_NAV.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                      isActive
                        ? 'bg-aurora-secondary-blue text-white shadow-aurora'
                        : 'text-white/70 hover:text-white hover:bg-aurora-secondary-green/20 cursor-pointer'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-aurora-primary-dark border-t border-aurora-primary-light/20 shadow-lg z-50">
        <div className="flex justify-around items-center py-2">
          {PRIMARY_NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-all ${
                  isActive ? 'text-aurora-secondary-green' : 'text-white/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-aurora-secondary-green' : 'text-white/70'}`} />
                  <span className={`text-xs font-medium truncate ${isActive ? 'text-aurora-secondary-green' : 'text-white/70'}`}>
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
