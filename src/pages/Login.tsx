import React, { useState } from 'react';
import { Eye, EyeOff, Heart, Brain, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoLight from '../assets/logos/logo light.png';
import heroGradient from '../assets/images/asset gradient multi.png';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'counselor'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        const result = await signUp(formData.email, formData.password, formData.fullName, formData.role);
        if (result.success) {
          setSuccessMessage(result.message);
          setIsSignUp(false); // Switch to login mode
          setFormData(prev => ({ ...prev, password: '', fullName: '', role: 'student' })); // Clear sensitive fields
        } else {
          setError(result.message);
        }
      } else {
        await signIn(formData.email, formData.password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccessMessage('');
    setFormData(prev => ({ 
      ...prev, 
      password: '', 
      fullName: '', 
      role: 'student' 
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen gradient-aurora flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <img 
          src={heroGradient} 
          alt="Aurora Background" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoLight} 
              alt="Aurora Mental Health Platform" 
              className="h-16 w-auto"
            />
          </div>
          <p className="text-center text-white/90 text-lg font-medium leading-relaxed">
            AI-powered mental health platform designed to help students map and track their emotional landscape effectively
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Brain className="w-6 h-6 text-aurora-accent-green mx-auto mb-2" />
            <p className="text-xs text-white/80 font-medium">Mood Tracking</p>
          </div>
          <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Users className="w-6 h-6 text-aurora-accent-orange mx-auto mb-2" />
            <p className="text-xs text-white/80 font-medium">Counselor Support</p>
          </div>
          <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Heart className="w-6 h-6 text-aurora-accent-pink mx-auto mb-2" />
            <p className="text-xs text-white/80 font-medium">Wellness Tools</p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="card-aurora">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-aurora-primary-dark font-primary">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-aurora-subtitle mt-2">
              {isSignUp ? 'Join Aurora to start your wellness journey' : 'Sign in to continue your wellness journey'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm" role="alert">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-aurora-primary-dark mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  autoComplete="name"
                  className="w-full px-3 py-2 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent text-aurora-primary-dark bg-white/80 backdrop-blur-sm transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-aurora-primary-dark mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                className="w-full px-3 py-2 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent text-aurora-primary-dark bg-white/80 backdrop-blur-sm transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-aurora-primary-dark mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full px-3 py-2 pr-10 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent text-aurora-primary-dark bg-white/80 backdrop-blur-sm transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-aurora-primary-dark/60 hover:text-aurora-primary-dark transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-aurora-primary-dark mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent text-aurora-primary-dark bg-white/80 backdrop-blur-sm transition-all"
                  required
                >
                  <option value="student">Student</option>
                  <option value="counselor">Counselor</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-aurora w-full py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleModeSwitch}
              className="text-aurora-secondary-blue hover:text-aurora-secondary-green text-sm font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-6 pt-6 border-t border-aurora-primary-light/20">
            <div className="flex items-center justify-center space-x-6 text-aurora-primary-dark/60">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-accent-green rounded-full"></div>
                <span className="text-xs">Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-accent-green rounded-full"></div>
                <span className="text-xs">Private</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-accent-green rounded-full"></div>
                <span className="text-xs">HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-white/60">
          <p>Aurora Mental Health Platform</p>
        </div>
      </div>
    </div>
  );
}
