import { EmotionDetection } from './EmotionDetection'
import { Zap, Frown, Target, Sparkles, MousePointerClick, Heart, PenLine } from 'lucide-react'
import type { MoodCheckInProps } from '../types/mood.types'
import { MANUAL_EMOTIONS } from '../utils/emotions'
import { getBlendedColorWeighted } from '../utils/moodColors'
import { useMoodCheckIn } from '../hooks/useMoodCheckIn'

export function MoodCheckIn({ onMoodLogged, onBackgroundChange }: MoodCheckInProps) {
  const {
    selectedEmotions,
    setSelectedEmotions,
    notes,
    setNotes,
    isManualMode,
    setIsManualMode,
    isSubmitting,
    energyLevel,
    setEnergyLevel,
    stressLevel,
    setStressLevel,
    existingLogId,
    handleAIEmotionDetected,
    handleManualEmotionToggle,
    handleSubmit,
  } = useMoodCheckIn({ onMoodLogged, onBackgroundChange })

  return (
    <div
      className="mood-checkin-container transition-all duration-500 overflow-y-auto lg:overflow-y-visible pb-24 lg:pb-0"
    >
      <div className="max-w-4xl mx-auto p-3 lg:p-4 min-h-full lg:min-h-0">
        {/* Header */}
        <div className="text-center mb-4 lg:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-[rgba(255,85,184,0.2)] to-[rgba(124,58,237,0.15)] mb-3 shadow-[0_0_20px_rgba(255,85,184,0.1)]">
            <Heart className="w-6 h-6 text-aurora-love" />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">Daily Mood Check-In</h1>
          <p className="text-sm text-aurora-text-sec">How are you feeling today? Let's capture your emotions.</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6 lg:mb-8">
          <div className="relative flex bg-white/5 p-1.5 rounded-full border border-white/8 backdrop-blur-sm">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[rgba(45,107,255,0.2)] border border-[rgba(45,107,255,0.35)] rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(45,107,255,0.1)] ${isManualMode ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                }`}
            />

            <button
              onClick={() => setIsManualMode(false)}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${!isManualMode
                ? 'text-aurora-blue'
                : 'text-aurora-text-muted hover:text-aurora-text-sec cursor-pointer'
                }`}
            >
              <Sparkles className={`w-4 h-4 ${!isManualMode ? 'animate-pulse' : ''}`} />
              AI Detection
            </button>

            <button
              onClick={() => setIsManualMode(true)}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${isManualMode
                ? 'text-aurora-blue'
                : 'text-aurora-text-muted hover:text-aurora-text-sec cursor-pointer'
                }`}
            >
              <MousePointerClick className="w-4 h-4" />
              Manual Selection
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 lg:space-y-4">
          {!isManualMode && (
            <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
          )}

          {isManualMode && (
            <div className="card-aurora p-5">
              <h3 className="text-lg font-semibold mb-4 text-white text-center">How are you feeling today?</h3>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-sm mx-auto">
                {MANUAL_EMOTIONS.map(emotion => {
                  const isSelected = selectedEmotions.some(e => e.emotion === emotion.name);
                  return (
                    <button
                      key={emotion.name}
                      onClick={() => handleManualEmotionToggle(emotion)}
                      className={`relative p-2 sm:p-3 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${isSelected
                        ? 'shadow-xl transform scale-105'
                        : 'hover:shadow-lg'
                        }`}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${emotion.color}80, ${emotion.color})`
                          : 'rgba(255,255,255,0.05)',
                        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isSelected ? `0 0 20px ${emotion.color}30` : undefined,
                      }}
                      aria-label={`Select ${emotion.label} emotion`}
                    >
                      <div className={`text-[10px] sm:text-xs font-medium text-center leading-tight ${isSelected ? 'text-white' : 'text-aurora-text-sec'
                        }`}>
                        {emotion.label}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-aurora-green rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mood Profile */}
          {selectedEmotions.length > 0 && (
            <div className="card-aurora p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Your Mood Profile</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-aurora-text-sec">Blended color:</span>
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white/20"
                    style={{
                      backgroundColor: getBlendedColorWeighted(selectedEmotions),
                      boxShadow: `0 0 12px ${getBlendedColorWeighted(selectedEmotions)}40`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {selectedEmotions.map((emotion, index) => (
                  <div key={index} className="flex flex-col p-4 bg-white/3 border border-white/8 rounded-[12px] gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: emotion.color, boxShadow: `0 0 8px ${emotion.color}40` }}
                        />
                        <span className="font-medium capitalize text-white">{emotion.emotion}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: emotion.color }}>
                        {Math.round(emotion.confidence * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-aurora-text-muted">Low</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={emotion.confidence}
                        onChange={(e) => {
                          const newConfidence = parseFloat(e.target.value);
                          setSelectedEmotions(prev =>
                            prev.map(item =>
                              item.emotion === emotion.emotion
                                ? { ...item, confidence: newConfidence }
                                : item
                            )
                          );
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${emotion.color} 0%, ${emotion.color} ${emotion.confidence * 100}%, rgba(255,255,255,0.08) ${emotion.confidence * 100}%, rgba(255,255,255,0.08) 100%)`
                        }}
                      />
                      <span className="text-xs text-aurora-text-muted">High</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Energy/Stress + Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <div className="card-aurora p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[rgba(34,197,94,0.25)] to-[rgba(34,197,94,0.1)] flex items-center justify-center">
                  <Zap className="w-[18px] h-[18px] text-aurora-green" />
                </div>
                <h3 className="text-lg font-semibold text-white">How's Your Energy?</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="energy-level" className="text-sm font-medium text-white mb-2 flex items-center justify-between">
                    <span>Energy Level</span>
                    <span className="text-lg">{energyLevel <= 3 ? '🔋' : energyLevel <= 7 ? '⚡️' : '🚀'}</span>
                  </label>
                  <input
                    id="energy-level"
                    name="energy-level"
                    type="range"
                    min="1"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #22C55E 0%, #22C55E ${energyLevel * 10}%, rgba(255,255,255,0.08) ${energyLevel * 10}%, rgba(255,255,255,0.08) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-aurora-text-muted mt-1">
                    <span>Exhausted</span>
                    <span>Energized</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="stress-level" className="text-sm font-medium text-white mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Frown className="w-4 h-4 text-aurora-text-sec" />
                      Stress Level
                    </div>
                    <span className="text-lg">{stressLevel <= 3 ? '😌' : stressLevel <= 7 ? '😐' : '🤯'}</span>
                  </label>
                  <input
                    id="stress-level"
                    name="stress-level"
                    type="range"
                    min="1"
                    max="10"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #F90038 0%, #F90038 ${stressLevel * 10}%, rgba(255,255,255,0.08) ${stressLevel * 10}%, rgba(255,255,255,0.08) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-aurora-text-muted mt-1">
                    <span>Relaxed</span>
                    <span>Stressed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-aurora p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(45,107,255,0.1)] flex items-center justify-center">
                  <PenLine className="w-[18px] h-[18px] text-aurora-blue" />
                </div>
                <label htmlFor="mood-notes" className="text-lg font-semibold text-white">Additional Notes</label>
              </div>
              <textarea
                id="mood-notes"
                name="mood-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's on your mind? Any specific events or thoughts affecting your mood today?"
                className="w-full p-4 border border-white/8 rounded-[12px] focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue outline-hidden resize-none text-white bg-white/3 placeholder:text-aurora-text-muted"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-aurora-text-muted mt-2 text-right">
                {notes.length}/500 characters
              </div>
            </div>
          </div>

          {/* Calendar Preview */}
          {selectedEmotions.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-[14px] p-6 text-center">
              <h4 className="text-sm font-medium text-aurora-text-sec mb-3">Preview: How this will appear on your calendar</h4>
              <div className="inline-flex items-center gap-3 px-5 py-3.5 rounded-[12px] bg-aurora-card border border-white/8">
                <div
                  className="w-9 h-9 rounded-full"
                  style={{
                    backgroundColor: getBlendedColorWeighted(selectedEmotions),
                    boxShadow: `0 0 12px ${getBlendedColorWeighted(selectedEmotions)}40`,
                  }}
                />
                <div className="text-left">
                  <div className="font-medium text-white">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-aurora-text-sec">
                    {selectedEmotions.map(e => e.emotion).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 pointer-events-none px-4 lg:static lg:p-0 lg:pt-3">
            <button
              onClick={handleSubmit}
              disabled={selectedEmotions.length === 0 || isSubmitting}
              className={`pointer-events-auto w-full max-w-sm px-8 py-4 rounded-2xl font-bold text-lg transition-all border border-white/12 backdrop-blur-sm ${selectedEmotions.length === 0 || isSubmitting
                ? 'bg-white/5 text-aurora-text-muted cursor-not-allowed shadow-none'
                : 'bg-aurora-blue text-white hover:bg-aurora-blue-light hover:-translate-y-1 active:scale-95 cursor-pointer shadow-[0_4px_25px_rgba(45,107,255,0.35)]'
                }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Target className="w-5 h-5" />
                  {existingLogId ? 'Update Check-In' : 'Complete Check-In'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MoodCheckIn;