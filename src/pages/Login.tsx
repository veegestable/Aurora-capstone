import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Heart, Brain, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoLight from '../assets/logos/logo light.png'
import heroGradient from '../assets/images/asset gradient multi.png'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'counselor'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (isSignUp) {
        const result = await signUp(formData.email, formData.password, formData.fullName, formData.role)
        if (result.success) {
          setSuccessMessage(result.message)
          setIsSignUp(false)
          setFormData(prev => ({ ...prev, password: '', fullName: '', role: 'student' }))
        } else {
          setError(result.message)
        }
      } else {
        await signIn(formData.email, formData.password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setSuccessMessage('')
    setFormData(prev => ({ 
      ...prev, 
      password: '', 
      fullName: '', 
      role: 'student' 
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <img 
          src={heroGradient} 
          alt="" 
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
          <p className="text-center text-aurora-text-sec text-lg font-medium leading-relaxed">
            AI-powered mental health platform designed to help students map and track their emotional landscape effectively
          </p>
        </div>

        {/* Features Preview */}
        <div className="flex justify-between gap-2 sm:grid sm:grid-cols-3 sm:gap-4 mb-8">
          <div className="flex-1 text-center p-2 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10">
            <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-aurora-green mx-auto mb-1 sm:mb-2" />
            <p className="text-[9px] sm:text-xs text-aurora-text-sec font-medium leading-tight">Mood Tracking</p>
          </div>
          <div className="flex-1 text-center p-2 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10">
            <Users className="w-4 h-4 sm:w-6 sm:h-6 text-aurora-orange mx-auto mb-1 sm:mb-2" />
            <p className="text-[9px] sm:text-xs text-aurora-text-sec font-medium leading-tight">Counselor Support</p>
          </div>
          <div className="flex-1 text-center p-2 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10">
            <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF55B8] mx-auto mb-1 sm:mb-2" />
            <p className="text-[9px] sm:text-xs text-aurora-text-sec font-medium leading-tight">Wellness Tools</p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="card-aurora p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white font-primary">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-aurora-text-sec mt-2 text-sm">
              {isSignUp ? 'Join Aurora to start your wellness journey' : 'Sign in to continue your wellness journey'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-[12px] text-aurora-red text-sm" role="alert">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] rounded-[12px] text-aurora-green text-sm" role="alert">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  autoComplete="name"
                  className="w-full px-3.5 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-aurora-card placeholder:text-aurora-text-muted transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                className="w-full px-3.5 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-aurora-card placeholder:text-aurora-text-muted transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide">
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
                  className="w-full px-3.5 py-3 pr-10 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-aurora-card placeholder:text-aurora-text-muted transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-aurora-text-muted hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-aurora-blue hover:text-aurora-blue-light transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="role" className="block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-aurora-card transition-all"
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
              className="btn-aurora w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleModeSwitch}
              className="text-aurora-blue hover:text-aurora-blue-light text-sm font-medium transition-colors cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-6 pt-6 border-t border-white/8">
            <div className="flex items-center justify-center space-x-6 text-aurora-text-muted">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-green rounded-full"></div>
                <span className="text-xs">Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-green rounded-full"></div>
                <span className="text-xs">Private</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-aurora-green rounded-full"></div>
                <span className="text-xs">HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-aurora-text-muted">
          <p>Aurora Mental Health Platform</p>
        </div>
      </div>
    </div>
  )
}