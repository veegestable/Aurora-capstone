import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import logoDark from './assets/logos/logo dark.png';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-aurora-blue-50 via-aurora-primary-light to-aurora-blue-100 flex items-center justify-center relative overflow-hidden px-4">
        {/* Animated background elements - scaled for mobile */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-aurora-secondary-blue rounded-full blur-2xl sm:blur-3xl animate-aurora-float"></div>
          <div className="absolute bottom-1/3 right-1/4 w-12 h-12 sm:w-18 sm:h-18 lg:w-24 lg:h-24 bg-aurora-accent-purple rounded-full blur-xl sm:blur-2xl animate-aurora-glow"></div>
          <div className="absolute top-1/2 right-1/3 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-aurora-emotions-joy rounded-full blur-lg sm:blur-xl animate-ping"></div>
          <div className="absolute bottom-1/2 left-1/3 w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-aurora-emotions-love rounded-full blur-xl sm:blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 text-center animate-aurora-float w-full max-w-sm sm:max-w-md">
          {/* Enhanced card with responsive sizing */}
          <div className="bg-white/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-aurora-lg p-6 sm:p-8 lg:p-10 border border-aurora-blue-200/30 animate-aurora-glow">
            {/* Logo with responsive sizing */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <img 
                src={logoDark} 
                alt="Aurora" 
                className="h-16 sm:h-20 lg:h-24 w-auto mx-auto filter drop-shadow-lg sm:drop-shadow-xl transition-all duration-700 hover:scale-105 sm:hover:scale-110 animate-aurora-glow"
              />
            </div>

            {/* Enhanced spinner with responsive sizing */}
            <div className="relative mb-4 sm:mb-6 lg:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto relative">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-2 sm:border-3 lg:border-4 border-aurora-blue-200/40"></div>
                {/* Animated ring 1 */}
                <div className="absolute inset-0 rounded-full border-2 sm:border-3 lg:border-4 border-transparent border-t-aurora-secondary-blue border-r-aurora-accent-purple animate-spin"></div>
                {/* Animated ring 2 - counter rotation */}
                <div className="absolute inset-1 rounded-full border-1 sm:border-2 border-transparent border-b-aurora-emotions-joy border-l-aurora-emotions-love animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
                {/* Inner glow with pulsing gradient */}
                <div className="absolute inset-2 sm:inset-3 rounded-full animate-aurora-pulse-gradient"></div>
                {/* Center dot */}
                <div className="absolute inset-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 -translate-x-1/2 -translate-y-1/2 bg-aurora-secondary-blue rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Enhanced loading text with responsive sizing */}
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gradient-aurora">
                Aurora
              </h2>
              <p className="text-aurora-primary-dark/80 font-body text-base sm:text-lg lg:text-xl tracking-wide">
                Mental Health Companion
              </p>
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mt-4 sm:mt-6">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-aurora-secondary-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-aurora-accent-purple rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-aurora-emotions-joy rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
            </div>
          </div>
          
          {/* Subtle loading message with responsive sizing */}
          <p className="mt-4 sm:mt-6 lg:mt-8 text-aurora-primary-dark/60 font-body text-sm sm:text-base animate-pulse">
            Preparing your personalized experience...
          </p>
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
