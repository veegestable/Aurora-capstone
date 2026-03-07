import { EmotionDetection } from './EmotionDetection'
import { Zap, Frown, Target, Sparkles, MousePointerClick } from 'lucide-react'
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
        <div className="text-center mb-3 lg:mb-4">
          <h1 className="text-xl lg:text-2xl font-bold text-aurora-primary-dark mb-1">Daily Mood Check-In</h1>
          <p className="text-sm text-aurora-primary-dark/70">How are you feeling today? Let's capture your emotions.</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6 lg:mb-8">
          <div className="relative flex bg-gray-100/50 p-1.5 rounded-full border border-gray-200 shadow-inner backdrop-blur-xs">
            {/* Sliding Background Pill */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-xs transition-all duration-300 ease-out ${isManualMode ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                }`}
            />

            <button
              onClick={() => setIsManualMode(false)}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${!isManualMode
                ? 'text-aurora-secondary-blue'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Sparkles className={`w-4 h-4 ${!isManualMode ? 'animate-pulse' : ''}`} />
              AI Detection
            </button>

            <button
              onClick={() => setIsManualMode(true)}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${isManualMode
                ? 'text-aurora-secondary-blue'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <MousePointerClick className="w-4 h-4" />
              Manual Selection
            </button>
          </div>
        </div>

        {/* Single column layout following mobile flow */}
        <div className="space-y-3 lg:space-y-4">
          {/* AI Emotion Detection */}
          {!isManualMode && (
            <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
          )}

          {/* Manual Emotion Selection */}
          {isManualMode && (
            <div className="card-aurora">
              <h3 className="text-lg font-semibold mb-4 text-aurora-primary-dark text-center">How are you feeling today?</h3>
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
                          : '#E5E7EB'
                      }}
                      aria-label={`Select ${emotion.label} emotion`}
                    >
                      <div className={`text-[10px] sm:text-xs font-medium text-center leading-tight ${isSelected ? 'text-white' : 'text-gray-600'
                        }`}>
                        {emotion.label}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-aurora-secondary-green rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Emotions with Intensity Controls */}
          {selectedEmotions.length > 0 && (
            <div className="card-aurora">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-aurora-primary-dark">Your Mood Profile</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-aurora-primary-dark/70">Blended color:</span>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: getBlendedColorWeighted(selectedEmotions) }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {selectedEmotions.map((emotion, index) => (
                  <div key={index} className="flex flex-col p-4 bg-aurora-primary-light/10 rounded-lg backdrop-blur-xs gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: emotion.color }}
                        />
                        <span className="font-medium capitalize text-aurora-primary-dark">{emotion.emotion}</span>
                      </div>
                      <span className="text-sm font-bold text-aurora-primary-dark/70">
                        {Math.round(emotion.confidence * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-aurora-primary-dark/50">Low</span>
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
                        className="w-full h-2 bg-aurora-primary-light/20 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, ${emotion.color} 0%, ${emotion.color} ${emotion.confidence * 100}%, #e2e8f0 ${emotion.confidence * 100}%, #e2e8f0 100%)`
                        }}
                      />
                      <span className="text-xs text-aurora-primary-dark/50">High</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column grid for desktop - Energy/Stress and Notes side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {/* Additional Metrics */}
            <div className="card-aurora">
              <h3 className="text-lg font-semibold mb-4 text-aurora-primary-dark">How's Your Energy?</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="energy-level" className="text-sm font-medium text-aurora-primary-dark mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Energy Level
                    </div>
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
                    className="w-full h-2 bg-aurora-primary-light/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #5ABA1C 0%, #5ABA1C ${energyLevel * 10}%, #e2e8f0 ${energyLevel * 10}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-aurora-primary-dark/60 mt-1">
                    <span>Exhausted</span>
                    <span>Energized</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="stress-level" className="text-sm font-medium text-aurora-primary-dark mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Frown className="w-4 h-4" />
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
                    className="w-full h-2 bg-aurora-primary-light/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #F90038 0%, #F90038 ${stressLevel * 10}%, #e2e8f0 ${stressLevel * 10}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-aurora-primary-dark/60 mt-1">
                    <span>Relaxed</span>
                    <span>Stressed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card-aurora">
              <label htmlFor="mood-notes" className="block text-lg font-semibold mb-4 text-aurora-primary-dark">Additional Notes</label>
              <textarea
                id="mood-notes"
                name="mood-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's on your mind? Any specific events or thoughts affecting your mood today?"
                className="w-full p-4 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent outline-hidden resize-none text-aurora-primary-dark bg-white/80 backdrop-blur-xs"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-aurora-primary-dark/60 mt-2 text-right">
                {notes.length}/500 characters
              </div>
            </div>
          </div>

          {/* Preview */}
          {selectedEmotions.length > 0 && (
            <div className="bg-aurora-primary-light/10 backdrop-blur-xs rounded-xl p-6 text-center border border-aurora-primary-light/20">
              <h4 className="text-sm font-medium text-aurora-primary-dark/70 mb-3">Preview: How this will appear on your calendar</h4>
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg shadow-aurora bg-white/90 backdrop-blur-xs">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: getBlendedColorWeighted(selectedEmotions) }}
                />
                <div className="text-left">
                  <div className="font-medium text-aurora-primary-dark">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-aurora-primary-dark/70">
                    {selectedEmotions.map(e => e.emotion).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 pointer-events-none px-4 lg:static lg:p-0 lg:pt-3">
            <button
              onClick={handleSubmit}
              disabled={selectedEmotions.length === 0 || isSubmitting}
              className={`pointer-events-auto w-full max-w-sm px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl border-2 border-white/20 backdrop-blur-xs ${selectedEmotions.length === 0 || isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-aurora-secondary-blue text-white hover:shadow-aurora hover:-translate-y-1 active:scale-95'
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
