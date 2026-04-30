import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmotionDetection } from './EmotionDetection'
import { 
  Sparkles, MousePointerClick, ChevronRight, ChevronLeft, 
  BedDouble, Zap, Frown, PenLine, X, MessageSquare, ArrowRight,
} from 'lucide-react'
import type { MoodCheckInProps } from '../types/mood.types'
import { MANUAL_EMOTIONS } from '../utils/emotions'
import { useAuth } from '../contexts/AuthContext'
import { useMoodCheckIn, CONTEXT_CATEGORIES } from '../hooks/useMoodCheckIn'
import type { SleepQuality } from '../services/mood/types'

export default function MoodCheckIn({ onMoodLogged, onBackgroundChange }: MoodCheckInProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] || 'Student'
  
  const {
    currentStep,
    totalSteps,
    handleNext,
    handleBack,
    selectedEmotions,
    moodInputMode,
    setMoodInputMode,
    intensity,
    setIntensity,
    energyLevel,
    setEnergyLevel,
    stressLevel,
    setStressLevel,
    sleepQuality,
    setSleepQuality,
    sleepCapturedToday,
    selectedTags,
    toggleTag,
    notes,
    setNotes,
    setJournalEdited,
    isSubmitting,
    handleAIEmotionDetected,
    handleManualEmotionToggle,
    handleSubmit,
  } = useMoodCheckIn({ 
    onMoodLogged: () => {
      if (onMoodLogged) onMoodLogged()
      // Note: we don't close the modal immediately so they can see Step 4 (Summary)
    }, 
    onBackgroundChange 
  })

  // Start check-in from dashboard widget
  const startCheckIn = (emotionName?: string) => {
    if (emotionName) {
      const target = MANUAL_EMOTIONS.find(e => e.name === emotionName)
      if (target) handleManualEmotionToggle(target)
      setMoodInputMode('manual')
    } else {
      setMoodInputMode('selfie')
    }
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    // Reload page to fully reset state after check-in, keeping the cache clean
    if (currentStep === 4) {
      window.location.reload()
    }
  }

  const progress = (currentStep / totalSteps) * 100

  return (
    <>
      {/* INITIAL WIDGET (On Dashboard) */}
      <div className="card-aurora p-5">
        <h3 className="text-lg font-semibold mb-4 text-white text-center">How are you feeling?</h3>
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {MANUAL_EMOTIONS.map(emotion => (
            <button
              key={emotion.name}
              onClick={() => startCheckIn(emotion.name)}
              className="group flex flex-col items-center gap-2 transition-all hover:scale-110 cursor-pointer"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors shadow-lg"
              >
                {emotion.emoji}
              </div>
              <span className="text-[10px] text-aurora-text-sec group-hover:text-white transition-colors">
                {emotion.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* FULL SCREEN WIZARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f0f11] w-full max-w-xl h-[90vh] sm:h-[85vh] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Header & Progress */}
            {currentStep < 4 && (
              <div className="px-5 pt-5 pb-3 border-b border-white/5 bg-[#0f0f11] z-10">
                <div className="flex justify-between items-center mb-4">
                  <button 
                    onClick={currentStep === 1 ? handleClose : handleBack} 
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {currentStep === 1 ? <X className="w-5 h-5 text-aurora-text-sec" /> : <ChevronLeft className="w-5 h-5 text-white" />}
                  </button>
                  <span className="text-sm font-semibold text-aurora-text-sec tracking-wider uppercase">
                    Step {currentStep} of {totalSteps - 1}
                  </span>
                  <div className="w-9" /> {/* Spacer */}
                </div>
                
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-linear-to-r from-aurora-blue to-aurora-purple transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              
              {/* STEP 1: MOOD SELECTION */}
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Identify your mood</h2>
                    <p className="text-sm text-aurora-text-sec">Use AI or select manually.</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="relative flex bg-white/5 p-1 rounded-full border border-white/8">
                      <button
                        onClick={() => setMoodInputMode('selfie')}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 cursor-pointer ${moodInputMode === 'selfie' ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border border-[rgba(45,107,255,0.3)]' : 'text-aurora-text-muted hover:text-white'}`}
                      >
                        <Sparkles className="w-4 h-4" /> Daily Selfie
                      </button>
                      <button
                        onClick={() => setMoodInputMode('manual')}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 cursor-pointer ${moodInputMode === 'manual' ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border border-[rgba(45,107,255,0.3)]' : 'text-aurora-text-muted hover:text-white'}`}
                      >
                        <MousePointerClick className="w-4 h-4" /> Manual Check-in
                      </button>
                    </div>
                  </div>

                  {moodInputMode === 'selfie' ? (
                    <div className="mt-4">
                      <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
                    </div>
                  ) : (
                    <div className="card-aurora p-6 max-w-sm mx-auto">
                      <div className="grid grid-cols-5 gap-4 justify-items-center">
                        {MANUAL_EMOTIONS.map(emotion => {
                          const isSelected = selectedEmotions.some(e => e.emotion === emotion.name);
                          return (
                            <button
                              key={emotion.name}
                              onClick={() => handleManualEmotionToggle(emotion)}
                              className={`flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer ${isSelected ? 'scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                            >
                              <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg"
                                style={{ 
                                  background: isSelected ? `linear-gradient(135deg, ${emotion.color}80, ${emotion.color})` : 'rgba(255,255,255,0.05)',
                                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: isSelected ? `0 0 20px ${emotion.color}40` : undefined,
                                }}
                              >
                                {emotion.emoji}
                              </div>
                              <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-aurora-text-sec'}`}>{emotion.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedEmotions.length > 0 && moodInputMode === 'manual' && (
                    <div className="card-aurora p-6 mt-6 animate-in fade-in max-w-sm mx-auto">
                      <label className="text-sm font-semibold text-white mb-5 block text-center">Mood Intensity</label>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-aurora-text-muted">Mild</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={intensity}
                          onChange={(e) => setIntensity(Number(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none bg-white/10 cursor-pointer accent-aurora-blue"
                        />
                        <span className="text-xs font-medium text-aurora-text-muted">Strong</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: VITALS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Check your vitals</h2>
                    <p className="text-sm text-aurora-text-sec">How are your physical levels today?</p>
                  </div>

                  <div className="card-aurora p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[rgba(34,197,94,0.15)]">
                          <Zap className="w-5 h-5 text-aurora-green" />
                        </div>
                        <h3 className="font-semibold text-white">Energy Level</h3>
                      </div>
                      <span className="text-2xl">{energyLevel <= 2 ? '🔋' : energyLevel <= 4 ? '⚡️' : '🚀'}</span>
                    </div>
                    <input
                      type="range" min="1" max="5" value={energyLevel}
                      onChange={(e) => setEnergyLevel(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none bg-white/10 cursor-pointer accent-aurora-green mb-3"
                    />
                    <div className="flex justify-between text-xs font-medium text-aurora-text-muted">
                      <span>Exhausted</span>
                      <span>Energized</span>
                    </div>
                  </div>

                  <div className="card-aurora p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[rgba(249,0,56,0.15)]">
                          <Frown className="w-5 h-5 text-aurora-red" />
                        </div>
                        <h3 className="font-semibold text-white">Stress Level</h3>
                      </div>
                      <span className="text-2xl">{stressLevel <= 2 ? '😌' : stressLevel <= 4 ? '😐' : '🤯'}</span>
                    </div>
                    <input
                      type="range" min="1" max="5" value={stressLevel}
                      onChange={(e) => setStressLevel(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none bg-white/10 cursor-pointer accent-aurora-red mb-3"
                    />
                    <div className="flex justify-between text-xs font-medium text-aurora-text-muted">
                      <span>Relaxed</span>
                      <span>Overwhelmed</span>
                    </div>
                  </div>

                  {!sleepCapturedToday && (
                    <div className="card-aurora p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-[rgba(146,15,254,0.15)]">
                          <BedDouble className="w-5 h-5 text-aurora-purple" />
                        </div>
                        <h3 className="font-semibold text-white">Sleep Quality</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { key: 'poor', emoji: '😴', label: 'Poor' },
                          { key: 'fair', emoji: '😐', label: 'Fair' },
                          { key: 'good', emoji: '😊', label: 'Good' }
                        ]).map(q => (
                          <button
                            key={q.key}
                            onClick={() => setSleepQuality(q.key as SleepQuality)}
                            className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all cursor-pointer ${sleepQuality === q.key ? 'bg-[rgba(146,15,254,0.2)] border-aurora-purple shadow-[0_0_15px_rgba(146,15,254,0.2)]' : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'}`}
                          >
                            <span className="text-2xl">{q.emoji}</span>
                            <span className={`text-sm font-medium ${sleepQuality === q.key ? 'text-white' : ''}`}>{q.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: CONTEXT & JOURNAL */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">What's going on?</h2>
                    <p className="text-sm text-aurora-text-sec">Select tags that describe your day.</p>
                  </div>

                  <div className="space-y-8">
                    {CONTEXT_CATEGORIES.map(category => (
                      <div key={category.key}>
                        <h4 className="text-sm font-semibold text-white mb-3 pl-1">{category.title}</h4>
                        <div className="flex flex-wrap gap-2.5">
                          {category.tags.map(tag => {
                            const isSelected = selectedTags.includes(tag)
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${isSelected ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border-aurora-blue shadow-[0_0_10px_rgba(45,107,255,0.2)]' : 'bg-white/5 text-aurora-text-sec border-white/10 hover:bg-white/10 hover:text-white'}`}
                              >
                                {tag.replace('-', ' ')}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <PenLine className="w-4 h-4 text-aurora-text-sec" />
                      <label className="text-sm font-semibold text-white">Journal Draft (Auto-filled)</label>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value)
                        setJournalEdited(true)
                      }}
                      className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-aurora-text-muted focus:outline-hidden focus:border-aurora-blue/50 focus:bg-white/10 transition-colors resize-none"
                      placeholder="Add more details about your day..."
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: SUMMARY */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                  
                  {/* Top Card */}
                  <div className="card-aurora p-6 flex flex-col items-center text-center">
                    <div className="w-22 h-22 bg-[rgba(124,58,237,0.15)] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(124,58,237,0.2)] border border-[rgba(124,58,237,0.3)]">
                      <img src="/images/logos/logomark light.png" className="w-12 h-12 text-aurora-purple" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 font-heading">
                      Thank you for checking in, {firstName}!
                    </h2>
                    <p className="text-sm text-aurora-text-sec leading-relaxed">
                      Keep tracking your mood regularly to better understand your daily patterns.
                    </p>
                  </div>

                  {/* Supportive Space Card */}
                  <div className="card-aurora p-5 border border-aurora-purple/50 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                    <h3 className="text-sm font-bold text-white mb-3">A supportive space for you</h3>
                    <button 
                      onClick={() => navigate('/student/messages')}
                      className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      Talk to a Counselor <MessageSquare className="w-4 h-4 text-aurora-text-sec" />
                    </button>
                  </div>

                  {/* Recommended Exercise */}
                  <div className="card-aurora p-5">
                    <p className="text-[10px] font-extrabold tracking-widest text-aurora-amber uppercase mb-1">
                      Recommended
                    </p>
                    <h3 className="text-base font-bold text-white mb-3">5-minute Breathing Exercise</h3>
                    
                    <button 
                      onClick={() => {
                        handleClose()
                        navigate('/student/resources')
                      }}
                      className="w-full bg-[#10143C] hover:bg-[#161b4d] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-bold text-white mb-1">Calm reset for your day</p>
                        <p className="text-xs font-semibold text-aurora-text-muted">5 Min</p>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center gap-1.5 text-xs font-bold text-aurora-amber tracking-wider">
                        TRY NOW <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card-aurora p-4 flex flex-col justify-center">
                      <p className="text-[10px] font-extrabold tracking-widest text-aurora-text-muted uppercase mb-1">
                        Streak
                      </p>
                      <p className="text-2xl font-bold text-white font-heading">
                        1 <span className="text-sm font-semibold text-aurora-text-sec ml-0.5">Days</span>
                      </p>
                    </div>
                    <div className="card-aurora p-4 flex flex-col justify-center">
                      <p className="text-[10px] font-extrabold tracking-widest text-aurora-text-muted uppercase mb-1">
                        Check-ins
                      </p>
                      <p className="text-2xl font-bold text-white font-heading">1</p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="p-5 border-t border-white/5 bg-[#0a0a0a]">
              {currentStep < 4 ? (
                <button
                  onClick={currentStep === 3 ? handleSubmit : handleNext}
                  disabled={(currentStep === 1 && selectedEmotions.length === 0) || (currentStep === 2 && !sleepCapturedToday && !sleepQuality) || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-aurora-blue hover:bg-aurora-blue-light text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(45,107,255,0.2)] cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : currentStep === 3 ? 'Save Check-in' : 'Continue'}
                  {!isSubmitting && currentStep < 3 && <ChevronRight className="w-5 h-5" />}
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="w-full bg-linear-to-r from-aurora-blue to-aurora-purple hover:opacity-90 text-white py-4 rounded-xl font-bold text-base transition-all shadow-[0_0_25px_rgba(124,58,237,0.3)] cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  )
}