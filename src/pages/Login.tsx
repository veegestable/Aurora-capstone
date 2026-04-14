import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Heart, Brain, Users, Shield, Lock, Award } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoLight from '../assets/logos/logo light.png'

const STARS = [
  { top: '8%', left: '12%', delay: '0s', size: '2px' },
  { top: '22%', left: '75%', delay: '1.5s', size: '1.5px' },
  { top: '45%', left: '88%', delay: '0.8s', size: '2px' },
  { top: '65%', left: '8%', delay: '2.2s', size: '1.5px' },
  { top: '78%', left: '55%', delay: '0.3s', size: '2px' },
  { top: '88%', left: '35%', delay: '1s', size: '1.5px' },
  { top: '18%', left: '42%', delay: '1.8s', size: '1px' },
  { top: '55%', left: '65%', delay: '2.5s', size: '1px' },
]

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
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #10143C 0%, #0B0D30 50%, #080B25 100%)' }}
    >
      {/* Shared Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/3 -left-1/4 w-[140%] h-[55%] rounded-full animate-aurora-float"
          style={{
            background: 'linear-gradient(135deg, rgba(45,107,255,0.14), rgba(124,58,237,0.08), transparent)',
            filter: 'blur(80px)',
            animationDuration: '8s',
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[120%] h-[50%] rounded-full animate-aurora-float"
          style={{
            background: 'linear-gradient(225deg, rgba(255,85,184,0.1), rgba(254,189,3,0.06), transparent)',
            filter: 'blur(80px)',
            animationDuration: '10s',
            animationDelay: '2s',
          }}
        />
      </div>

      <div className="absolute inset-0 opacity-35">
        <div className="absolute top-[12%] left-[10%] w-40 lg:w-52 h-40 lg:h-52 bg-[#2D6BFF] rounded-full blur-3xl animate-aurora-float" />
        <div className="absolute bottom-[18%] right-[8%] w-32 lg:w-44 h-32 lg:h-44 bg-[#7C3AED] rounded-full blur-3xl animate-aurora-glow" />
        <div className="absolute top-[50%] right-[35%] w-20 lg:w-28 h-20 lg:h-28 bg-[#FEBD03] rounded-full blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[30%] left-[55%] w-16 lg:w-24 h-16 lg:h-24 bg-[#FF55B8] rounded-full blur-3xl animate-aurora-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[35%] left-[25%] w-16 lg:w-24 h-16 lg:h-24 bg-[#22C55E] rounded-full blur-2xl animate-aurora-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="absolute inset-0">
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: '3s',
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center p-12 xl:p-16">
        <div className="relative z-10 max-w-lg text-center">
          <img
            src={logoLight}
            alt="Aurora"
            className="h-20 xl:h-24 w-auto mx-auto mb-6 filter drop-shadow-xl"
          />
          <p className="text-aurora-text-sec text-lg xl:text-xl font-medium leading-relaxed mb-10">
            AI-powered mental health platform designed to help students map and track their emotional landscape effectively
          </p>

          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="text-center p-4 xl:p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
              <Brain className="w-7 h-7 text-aurora-green mx-auto mb-2" />
              <p className="text-sm text-aurora-text-sec font-medium">Mood Tracking</p>
            </div>
            <div className="text-center p-4 xl:p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
              <Users className="w-7 h-7 text-aurora-orange mx-auto mb-2" />
              <p className="text-sm text-aurora-text-sec font-medium">Counselor Support</p>
            </div>
            <div className="text-center p-4 xl:p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
              <Heart className="w-7 h-7 text-[#FF55B8] mx-auto mb-2" />
              <p className="text-sm text-aurora-text-sec font-medium">Wellness Tools</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-aurora-text-muted">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-aurora-green" />
              <span className="text-xs font-medium">Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-aurora-green" />
              <span className="text-xs font-medium">Private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-aurora-green" />
              <span className="text-xs font-medium">HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-h-screen flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile-only compact branding */}
          <div className="lg:hidden text-center mb-8">
            <img
              src={logoLight}
              alt="Aurora"
              className="h-14 w-auto mx-auto mb-4"
            />
            <p className="text-aurora-text-sec text-sm font-medium leading-relaxed">
              AI-powered mental health platform for students
            </p>
          </div>

          <div className="card-aurora p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-primary">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-aurora-text-sec mt-2 text-sm sm:text-base">
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

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full px-4 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-white/5 placeholder:text-aurora-text-muted transition-all outline-hidden"
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
                  className="w-full px-4 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-white/5 placeholder:text-aurora-text-muted transition-all outline-hidden"
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
                    className="w-full px-4 py-3 pr-11 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-white/5 placeholder:text-aurora-text-muted transition-all outline-hidden"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-aurora-text-muted hover:text-white transition-colors"
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
                    className="w-full px-4 py-3 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue text-white bg-white/5 transition-all outline-hidden"
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

            {/* Mobile-only trust indicators */}
            <div className="lg:hidden mt-8 pt-6 border-t border-white/8">
              <div className="flex items-center justify-center gap-6 text-aurora-text-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-aurora-green rounded-full" />
                  <span className="text-xs">Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-aurora-green rounded-full" />
                  <span className="text-xs">Private</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-aurora-green rounded-full" />
                  <span className="text-xs">HIPAA</span>
                </div>
              </div>
            </div>

            <p className="text-center mt-8 text-xs text-aurora-text-muted">
              Aurora Mental Health Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}