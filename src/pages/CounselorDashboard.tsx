import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { counselorService } from '../services/counselor.service';
import { Users, BarChart3, MessageSquare, Settings, LogOut } from 'lucide-react';
import logoLight from '../assets/logos/logo light.png';

export default function CounselorDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentList = await counselorService.getStudents();
        setStudents(studentList);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const tabs = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
              <h1 className="text-lg sm:text-xl font-bold text-white hidden xs:block font-primary">Aurora - Counselor</h1>
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
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === tab.id
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
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-aurora-accent-orange/10 to-aurora-secondary-green/10 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
            {activeTab === 'students' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2 font-primary">Students Overview</h2>
                  <p className="text-aurora-subtitle">
                    Monitor and support your students' mental health journey.
                  </p>
                </div>
                <div className="card-aurora">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-blue-500"></div>
                      <span className="ml-3 text-aurora-primary-dark/70">Loading students...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {students.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-aurora-primary-light/60 mx-auto mb-3" />
                          <p className="text-aurora-primary-dark/60">No students found.</p>
                          <p className="text-sm text-aurora-primary-dark/50 mt-1">Students will appear here once they register.</p>
                        </div>
                      ) : (
                        students.map((student: any) => (
                          <div key={student.id} className="border border-aurora-primary-light/30 rounded-lg p-4 bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all">
                            <h3 className="font-medium text-aurora-primary-dark">{student.full_name}</h3>
                            <p className="text-sm text-aurora-primary-dark/60">{student.email}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-aurora-accent-green/20 text-aurora-accent-green">
                                Active
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2 font-primary">Analytics Dashboard</h2>
                  <p className="text-aurora-subtitle">
                    Track student progress and mood patterns across your caseload.
                  </p>
                </div>
                <div className="card-aurora">
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
                    <p className="text-aurora-primary-dark/60 text-lg">Analytics dashboard coming soon...</p>
                    <p className="text-sm text-aurora-primary-dark/50 mt-2">Track student progress and mood patterns across your caseload.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2 font-primary">Messages</h2>
                  <p className="text-aurora-subtitle">
                    Communicate securely with students and colleagues.
                  </p>
                </div>
                <div className="card-aurora">
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
                    <p className="text-aurora-primary-dark/60 text-lg">Messaging system coming soon...</p>
                    <p className="text-sm text-aurora-primary-dark/50 mt-2">Communicate securely with students and colleagues.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark mb-2 font-primary">Settings</h2>
                  <p className="text-aurora-subtitle">
                    Customize your dashboard preferences and notifications.
                  </p>
                </div>
                <div className="card-aurora">
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
                    <p className="text-aurora-primary-dark/60 text-lg">Settings panel coming soon...</p>
                    <p className="text-sm text-aurora-primary-dark/50 mt-2">Customize your dashboard preferences and notifications.</p>
                  </div>
                </div>
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
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-all ${activeTab === tab.id
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
