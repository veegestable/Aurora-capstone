import { useState } from 'react'
import { Sparkles, MousePointerClick, Clock3 } from 'lucide-react'
import { EmotionDetection } from '../EmotionDetection'
import { MoodIcon } from '../student/MoodIcon'
import type { MoodIconName } from '../../constants/mood/moodIconPng'
import type { DetectedEmotion, ManualEmotion } from '../../types/mood.types'
import { MANUAL_EMOTIONS } from '../../utils/emotions'
import { getColorWithAlpha } from '../../utils/moodColors'
import { getDurationCategoryLabel } from '../../constants/mood/journalTemplates'
import { HintButton, HintPanel, type HintKey } from './HintSystem'

interface StepMoodSelectionProps {
  selectedEmotions: DetectedEmotion[]
  moodInputMode: 'manual' | 'selfie'
  setMoodInputMode: (mode: 'manual' | 'selfie') => void
  aiDetectedReady: boolean
  intensity: number
  setIntensity: (v: number) => void
  durationMinutes: number
  setDurationMinutes: (v: number) => void
  handleAIEmotionDetected: (emotions: DetectedEmotion[]) => void
  handleManualEmotionToggle: (emotion: ManualEmotion) => void
  activeHint: HintKey
  onHintToggle: (next: HintKey) => void
  moodAccent: string | null
}

export function StepMoodSelection({
  selectedEmotions, moodInputMode, setMoodInputMode, aiDetectedReady,
  intensity, setIntensity, durationMinutes, setDurationMinutes,
  handleAIEmotionDetected, handleManualEmotionToggle,
  activeHint, onHintToggle, moodAccent,
}: StepMoodSelectionProps) {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Identify your mood</h2>
        <p className="text-sm text-aurora-text-sec">How are you feeling right now?</p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div className="relative flex bg-white/5 p-1 rounded-full border border-white/8">
          {(['manual', 'selfie'] as const).map((mode) => {
            const isActive = moodInputMode === mode
            const Icon = mode === 'manual' ? MousePointerClick : Sparkles
            const label = mode === 'manual' ? 'Manual Check-in' : 'Daily Selfie'
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setMoodInputMode(mode)}
                className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 cursor-pointer border ${
                  isActive ? 'text-white border-transparent' : 'text-aurora-text-muted hover:text-white border-transparent'
                }`}
                style={
                  isActive && moodAccent
                    ? { background: getColorWithAlpha(moodAccent, 0.22), borderColor: getColorWithAlpha(moodAccent, 0.42) }
                    : isActive
                      ? { background: 'rgba(45,107,255,0.2)', borderColor: 'rgba(45,107,255,0.3)' }
                      : undefined
                }
              >
                <Icon className="w-4 h-4 shrink-0" /> {label}
              </button>
            )
          })}
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
          <div className="card-aurora p-6 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-1.5 mb-5">
              <p className="text-xs font-bold tracking-widest text-aurora-text-muted uppercase">Pick what fits</p>
              <HintButton hint="manual" active={activeHint} onToggle={onHintToggle} ariaLabel="Manual check-in hint" />
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
                      <MoodIcon name={emotion.name as MoodIconName} size={36} ariaLabel={emotion.label} />
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-aurora-text-sec'}`}>
                      {emotion.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {activeHint === 'manual' && <HintPanel hint="manual" onClose={() => onHintToggle(null)} />}
        </>
      )}

      {/* Intensity — manual only, after mood picked */}
      {selectedEmotions.length > 0 && moodInputMode === 'manual' && (
        <>
          <div className="card-aurora p-6 max-w-sm mx-auto animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <label htmlFor="mood-intensity" className="text-sm font-bold text-white">Intensity</label>
                <HintButton hint="intensity" active={activeHint} onToggle={onHintToggle} ariaLabel="Intensity hint" />
              </div>
              <span className="text-base font-extrabold tabular-nums" style={{ color: moodAccent ?? '#2D6BFF' }}>
                {intensity}<span className="text-aurora-text-muted text-xs font-semibold">/10</span>
              </span>
            </div>
            <input
              id="mood-intensity" type="range" min={1} max={10} step={1} value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none bg-white/10 cursor-pointer mood-intensity-slider"
              style={moodAccent ? { ['--thumb-mood' as string]: moodAccent } : undefined}
              aria-valuemin={1} aria-valuemax={10} aria-valuenow={intensity} aria-label="Mood intensity"
            />
            <div className="flex justify-between text-xs font-medium text-aurora-text-muted mt-2">
              <span>Mild</span><span>Strong</span>
            </div>
          </div>
          {activeHint === 'intensity' && <HintPanel hint="intensity" onClose={() => onHintToggle(null)} />}
        </>
      )}

      {/* Duration — manual only, after mood picked */}
      {selectedEmotions.length > 0 && moodInputMode === 'manual' && (
        <>
          <div className="card-aurora p-6 max-w-sm mx-auto animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-aurora-text-muted" />
                <label htmlFor="mood-duration" className="text-sm font-bold text-white">Duration</label>
                <HintButton hint="duration" active={activeHint} onToggle={onHintToggle} ariaLabel="Duration hint" />
              </div>
              <span className="text-xs font-medium text-aurora-text-sec">{getDurationCategoryLabel(durationMinutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="mood-duration" type="text" inputMode="numeric" pattern="[0-9]*"
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
          {activeHint === 'duration' && <HintPanel hint="duration" onClose={() => onHintToggle(null)} />}
        </>
      )}
    </div>
  )
}