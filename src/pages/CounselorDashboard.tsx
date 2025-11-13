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
      <header className="card-aurora border-b border-aurora-primary-light/20 mb-0 rounded-none shadow-aurora">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src={logoLight} 
                alt="Aurora Mental Health Platform" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-aurora-primary-dark">Aurora - Counselor</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 gradient-aurora-primary rounded-full flex items-center justify-center ring-2 ring-aurora-blue-500/20">
                  <span className="text-white text-sm font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-aurora-primary-dark/70">Welcome, {user?.full_name}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-aurora-primary-dark/70 hover:text-aurora-primary-dark transition-colors px-3 py-2 rounded-md hover:bg-aurora-primary-light/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="card-aurora mb-0 rounded-none border-t-0 shadow-aurora">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-aurora-secondary-blue text-aurora-secondary-blue'
                      : 'border-transparent text-aurora-primary-dark/60 hover:text-aurora-primary-dark hover:border-aurora-primary-light/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'students' && (
          <div className="card-aurora">
            <h2 className="text-lg font-semibold mb-4 text-aurora-primary-dark">Students Overview</h2>
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
        )}
        
        {activeTab === 'analytics' && (
          <div className="card-aurora">
            <h2 className="text-lg font-semibold mb-4 text-aurora-primary-dark">Analytics Dashboard</h2>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
              <p className="text-aurora-primary-dark/60 text-lg">Analytics dashboard coming soon...</p>
              <p className="text-sm text-aurora-primary-dark/50 mt-2">Track student progress and mood patterns across your caseload.</p>
            </div>
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="card-aurora">
            <h2 className="text-lg font-semibold mb-4 text-aurora-primary-dark">Messages</h2>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
              <p className="text-aurora-primary-dark/60 text-lg">Messaging system coming soon...</p>
              <p className="text-sm text-aurora-primary-dark/50 mt-2">Communicate securely with students and colleagues.</p>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="card-aurora">
            <h2 className="text-lg font-semibold mb-4 text-aurora-primary-dark">Settings</h2>
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-aurora-primary-light/60 mx-auto mb-4" />
              <p className="text-aurora-primary-dark/60 text-lg">Settings panel coming soon...</p>
              <p className="text-sm text-aurora-primary-dark/50 mt-2">Customize your dashboard preferences and notifications.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
