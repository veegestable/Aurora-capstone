import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MoodCheckIn from '../components/MoodCheckIn';
import MoodCalendar from '../components/MoodCalendar';
import Analytics from '../components/Analytics';
import NotificationPanel from '../components/NotificationPanel';
import ScheduleManager from '../components/ScheduleManager';
import { Heart, BarChart3, Bell, Calendar, LogOut, CalendarDays } from 'lucide-react';
import logoLight from '../assets/logos/logo light.png';

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('mood');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'mood', label: 'Mood Check-in', icon: Heart },
    { id: 'calendar', label: 'Mood Calendar', icon: CalendarDays },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleMoodLogged = () => {
    console.log('Mood check-in completed');
    // Refresh analytics and calendar when mood is submitted
    setRefreshKey((prev) => prev + 1);
    // Optionally switch to calendar tab to see the new entry
    setActiveTab('calendar');
  };

  return (
    <div className="min-h-screen gradient-aurora-light">
      {/* Header */}
      <header className="bg-aurora-primary-dark border-b border-aurora-primary-light/20 mb-0 shadow-aurora">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <img 
                src={logoLight} 
                alt="Aurora Mental Health Platform" 
                className="h-6 sm:h-8 w-auto"
              />
              <h1 className="text-lg sm:text-xl font-bold text-white hidden xs:block">Aurora</h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 gradient-aurora-primary rounded-full flex items-center justify-center ring-2 ring-aurora-blue-500/20">
                  <span className="text-white text-xs sm:text-sm font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-white/90 hidden sm:block">Welcome, {user?.full_name}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-1 sm:space-x-2 text-white/70 hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-md hover:bg-white/10"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Desktop Sidebar - Hidden on Mobile */}
        <aside className="hidden lg:block w-64 bg-aurora-primary-dark shadow-aurora flex-shrink-0">
          <nav className="h-full px-4 py-6">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-aurora-secondary-blue text-white shadow-aurora'
                        : 'text-white/70 hover:text-white hover:bg-aurora-secondary-green/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-aurora-primary-light/10 to-aurora-blue-500/10 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
            {activeTab === 'mood' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2">Daily Mood Check-In</h2>
                  <p className="text-sm sm:text-base text-aurora-primary-dark/70">
                    Let's capture how you're feeling today. Use AI detection or select emotions manually.
                  </p>
                </div>
                <MoodCheckIn onMoodLogged={handleMoodLogged} />
              </div>
            )}

            {activeTab === 'calendar' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2">Mood Calendar</h2>
                  <p className="text-sm sm:text-base text-aurora-primary-dark/70">
                    View your emotional journey through time. Click on any day to see detailed mood information.
                  </p>
                </div>
                <MoodCalendar key={refreshKey} />
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2">Mood Analytics</h2>
                  <p className="text-sm sm:text-base text-aurora-primary-dark/70">
                    Track your emotional patterns and insights over time.
                  </p>
                </div>
                <Analytics key={refreshKey} />
              </div>
            )}
            
            {activeTab === 'schedule' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2">Academic Schedule</h2>
                  <p className="text-sm sm:text-base text-aurora-primary-dark/70">
                    Manage your academic events and see how they relate to your mood patterns.
                  </p>
                </div>
                <ScheduleManager />
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2">Notifications</h2>
                  <p className="text-sm sm:text-base text-aurora-primary-dark/70">
                    Stay updated with reminders, check-in alerts, and important messages.
                  </p>
                </div>
                <NotificationPanel />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-aurora-primary-dark border-t border-aurora-primary-light/20 shadow-lg z-50">
        <div className="flex justify-around items-center py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-all ${
                  activeTab === tab.id
                    ? 'text-aurora-secondary-green'
                    : 'text-white/70'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'text-aurora-secondary-green' : 'text-white/70'}`} />
                <span className={`text-xs font-medium truncate ${activeTab === tab.id ? 'text-aurora-secondary-green' : 'text-white/70'}`}>
                  {tab.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
