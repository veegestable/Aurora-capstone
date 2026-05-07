import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmotionDetection } from './EmotionDetection'
import {
  Sparkles, MousePointerClick, ChevronRight, ChevronLeft,
  BedDouble, Zap, Frown, PenLine, X, MessageSquare, ArrowRight,
  CircleHelp, Clock3, RefreshCw, Check,
} from 'lucide-react'
import type { MoodCheckInProps, ManualEmotion } from '../types/mood.types'
import { MANUAL_EMOTIONS } from '../utils/emotions'
import { useAuth } from '../contexts/AuthContext'
import { useMoodCheckIn, CONTEXT_CATEGORIES } from '../hooks/useMoodCheckIn'
import type { SleepQuality } from '../services/mood/types'
import { MoodIcon } from './student/MoodIcon'

type HintKey = 'manual' | 'intensity' | 'duration' | null

const HINTS: Record<Exclude<HintKey, null>, { title: string; body: string }> = {
  manual: {
    title: 'Manual Check-in',
    body: 'Pick the emotion that fits best right now. You can fine-tune intensity and how long it has been with you in the next two controls.',
  },
  intensity: {
    title: 'Intensity scale (1–10)',
    body: 'How strongly you feel the selected emotion right now.\n\n• 1–3: Mild\n• 4–6: Noticeable\n• 7–8: Strong\n• 9–10: Very intense\n\nUse the number that matches how strong it feels — not whether it is good or bad.',
  },
  duration: {
    title: 'Duration',
    body: 'Roughly how long this feeling has been with you. Type a number of minutes (1–1440). The label below adapts as you type.',
  },
}

function getDurationCategoryLabel(minutes: number): string {
  if (minutes < 15) return 'Just a moment'
  if (minutes <= 60) return 'About an hour'
  if (minutes <= 180) return 'A few hours'
  if (minutes <= 480) return 'Most of the day'
  return 'All day / Ongoing'
}

interface HintButtonProps {
  hint: Exclude<HintKey, null>
  active: HintKey
  onToggle: (next: HintKey) => void
  ariaLabel?: string
}

function HintButton({ hint, active, onToggle, ariaLabel }: HintButtonProps) {
  const isOpen = active === hint
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Show ${hint} hint`}
      onClick={() => onToggle(isOpen ? null : hint)}
      className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
    >
      <CircleHelp className={`w-4 h-4 ${isOpen ? 'text-aurora-blue' : 'text-aurora-text-muted'}`} />
    </button>
  )
}

function HintPanel({ hint, onClose }: { hint: Exclude<HintKey, null>; onClose: () => void }) {
  const { title, body } = HINTS[hint]
  return (
    <div className="card-aurora border-aurora-blue/30 bg-[rgba(45,107,255,0.08)] p-4 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-2">
        <CircleHelp className="w-4 h-4 text-aurora-blue mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{title}</p>
          <p className="text-xs text-aurora-text-sec whitespace-pre-line leading-relaxed">{body}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss hint"
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-aurora-text-muted" />
        </button>
      </div>
    </div>
  )
}

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
    detectionMethod,
    intensity,
    setIntensity,
    durationMinutes,
    setDurationMinutes,
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
    clearDetectedEmotions,
    handleManualEmotionToggle,
    handleSubmit,
  } = useMoodCheckIn({
    onMoodLogged: () => {
      if (onMoodLogged) onMoodLogged()
      // Note: we don't close the modal immediately so they can see Step 4 (Summary)
    },
    onBackgroundChange,
  })

  const [activeHint, setActiveHint] = useState<HintKey>(null)
  const [durationDraft, setDurationDraft] = useState<string>(String(durationMinutes))

  const commitDuration = () => {
    if (!durationDraft) {
      setDurationDraft(String(durationMinutes))
      return
    }
    const parsed = Number(durationDraft)
    const next = Number.isNaN(parsed) ? durationMinutes : Math.min(1440, Math.max(1, parsed))
    setDurationMinutes(next)
    setDurationDraft(String(next))
  }

  const startCheckIn = (emotionName?: string) => {
    setActiveHint(null)
    if (emotionName) {
      const target = MANUAL_EMOTIONS.find((e: ManualEmotion) => e.name === emotionName)
      if (target) handleManualEmotionToggle(target)
      setMoodInputMode('manual')
    } else {
      setMoodInputMode('selfie')
    }
    setIsModalOpen(true)
  }

  const aiDetectedReady = moodInputMode === 'selfie' && detectionMethod === 'selfie_ai' && selectedEmotions.length > 0

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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Identify your mood</h2>
                    <p className="text-sm text-aurora-text-sec">How are you feeling right now?</p>
                  </div>

                  {/* Mode toggle — Manual on the LEFT, Daily Selfie on the RIGHT (round 5 plan §1) */}
                  <div className="flex justify-center">
                    <div className="relative flex bg-white/5 p-1 rounded-full border border-white/8">
                      <button
                        onClick={() => setMoodInputMode('manual')}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 cursor-pointer ${moodInputMode === 'manual' ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border border-[rgba(45,107,255,0.3)]' : 'text-aurora-text-muted hover:text-white'}`}
                      >
                        <MousePointerClick className="w-4 h-4" /> Manual Check-in
                      </button>
                      <button
                        onClick={() => setMoodInputMode('selfie')}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 cursor-pointer ${moodInputMode === 'selfie' ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border border-[rgba(45,107,255,0.3)]' : 'text-aurora-text-muted hover:text-white'}`}
                      >
                        <Sparkles className="w-4 h-4" /> Daily Selfie
                      </button>
                    </div>
                  </div>

                  {moodInputMode === 'selfie' ? (
                    <div className="mt-2">
                      <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
                      {aiDetectedReady && (
                        <p className="text-center text-xs text-aurora-text-sec mt-3">
                          Detected: <span className="text-white font-semibold capitalize">{selectedEmotions[0].emotion}</span>. Use the buttons below to keep it or retake.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Manual emotion picker */}
                      <div className="card-aurora p-6 max-w-sm mx-auto">
                        <div className="flex items-center justify-center gap-1.5 mb-5">
                          <p className="text-xs font-bold tracking-widest text-aurora-text-muted uppercase">
                            Pick what fits
                          </p>
                          <HintButton hint="manual" active={activeHint} onToggle={setActiveHint} ariaLabel="Manual check-in hint" />
                        </div>
                        <div className="grid grid-cols-5 gap-3 justify-items-center">
                          {MANUAL_EMOTIONS.map((emotion: ManualEmotion) => {
                            const isSelected = selectedEmotions.some((e) => e.emotion === emotion.name)
                            return (
                              <button
                                key={emotion.name}
                                onClick={() => handleManualEmotionToggle(emotion)}
                                className={`flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer ${isSelected ? 'scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                aria-pressed={isSelected}
                                aria-label={emotion.label}
                              >
                                <div
                                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                                  style={{
                                    background: isSelected ? `linear-gradient(135deg, ${emotion.color}80, ${emotion.color})` : 'rgba(255,255,255,0.05)',
                                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: isSelected ? `0 0 20px ${emotion.color}40` : undefined,
                                    color: isSelected ? '#FFFFFF' : emotion.color,
                                  }}
                                >
                                  <MoodIcon name={emotion.name as 'happy' | 'sad' | 'angry' | 'surprise' | 'neutral'} size={30} />
                                </div>
                                <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-aurora-text-sec'}`}>
                                  {emotion.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {activeHint === 'manual' && (
                        <HintPanel hint="manual" onClose={() => setActiveHint(null)} />
                      )}
                    </>
                  )}

                  {/* Intensity slider — manual only, after a mood is picked */}
                  {selectedEmotions.length > 0 && moodInputMode === 'manual' && (
                    <>
                      <div className="card-aurora p-6 max-w-sm mx-auto animate-in fade-in">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5">
                            <label htmlFor="mood-intensity" className="text-sm font-bold text-white">
                              Intensity
                            </label>
                            <HintButton hint="intensity" active={activeHint} onToggle={setActiveHint} ariaLabel="Intensity hint" />
                          </div>
                          <span className="text-base font-extrabold text-aurora-blue tabular-nums">
                            {intensity}<span className="text-aurora-text-muted text-xs font-semibold">/10</span>
                          </span>
                        </div>
                        <input
                          id="mood-intensity"
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={intensity}
                          onChange={(e) => setIntensity(Number(e.target.value))}
                          className="w-full h-3 rounded-full appearance-none bg-white/10 cursor-pointer accent-aurora-blue mood-intensity-slider"
                          aria-valuemin={1}
                          aria-valuemax={10}
                          aria-valuenow={intensity}
                          aria-label="Mood intensity"
                        />
                        <div className="flex justify-between text-xs font-medium text-aurora-text-muted mt-2">
                          <span>Mild</span>
                          <span>Strong</span>
                        </div>
                      </div>

                      {activeHint === 'intensity' && (
                        <HintPanel hint="intensity" onClose={() => setActiveHint(null)} />
                      )}
                    </>
                  )}

                  {/* Duration of feeling — manual only, after a mood is picked */}
                  {selectedEmotions.length > 0 && moodInputMode === 'manual' && (
                    <>
                      <div className="card-aurora p-6 max-w-sm mx-auto animate-in fade-in">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="w-4 h-4 text-aurora-text-muted" />
                            <label htmlFor="mood-duration" className="text-sm font-bold text-white">
                              Duration
                            </label>
                            <HintButton hint="duration" active={activeHint} onToggle={setActiveHint} ariaLabel="Duration hint" />
                          </div>
                          <span className="text-xs font-medium text-aurora-text-sec">
                            {getDurationCategoryLabel(durationMinutes)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="mood-duration"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={durationDraft}
                            onChange={(e) => setDurationDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            onBlur={commitDuration}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-semibold focus:outline-hidden focus:border-aurora-blue/50 focus:bg-white/10 transition-colors"
                            aria-label="Duration of feeling in minutes"
                          />
                          <span className="text-sm font-semibold text-aurora-text-sec">min</span>
                        </div>
                      </div>

                      {activeHint === 'duration' && (
                        <HintPanel hint="duration" onClose={() => setActiveHint(null)} />
                      )}
                    </>
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
              {currentStep === 1 && aiDetectedReady ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={clearDetectedEmotions}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake Photo
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center justify-center gap-2 bg-aurora-blue hover:bg-aurora-blue-light text-white py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(45,107,255,0.2)] cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Use This Mood
                  </button>
                </div>
              ) : currentStep < 4 ? (
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