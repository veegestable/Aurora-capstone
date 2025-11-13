import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import logoLight from './assets/logos/logo light.png';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-aurora-light flex items-center justify-center">
        <div className="text-center card-aurora">
          <img 
            src={logoLight} 
            alt="Aurora" 
            className="h-16 w-auto mx-auto mb-4 opacity-80"
          />
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora-blue-500 mx-auto"></div>
          <p className="mt-4 text-aurora-primary-dark font-medium">Loading Aurora...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Login />
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              user.role === 'student' ? (
                <StudentDashboard />
              ) : (
                <CounselorDashboard />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
