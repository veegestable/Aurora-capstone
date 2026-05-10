import { useMemo, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import type { MoodCheckInProps, ManualEmotion } from '../../types/mood.types'
import type { MoodIconName } from '../../constants/mood/moodIconPng'
import { MANUAL_EMOTIONS } from '../../utils/emotions'
import { useMoodCheckIn } from '../../hooks/useMoodCheckIn'
import { getBlendedColorWeighted, getColorWithAlpha } from '../../utils/moodColors'
import { MoodIcon } from '../student/MoodIcon'
import { StepMoodSelection } from './StepMoodSelection'
import { StepVitals } from './StepVitals'
import { StepContext } from './StepContext'
import { StepSummary } from './StepSummary'
import { WizardFooter } from './WizardFooter'
import type { HintKey } from './HintSystem'

export default function MoodCheckIn({ onMoodLogged, onBackgroundChange }: MoodCheckInProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeHint, setActiveHint] = useState<HintKey>(null)

  const {
    currentStep, totalSteps, handleNext, handleBack,
    selectedEmotions, moodInputMode, setMoodInputMode, detectionMethod,
    intensity, setIntensity, durationMinutes, setDurationMinutes,
    energyLevel, setEnergyLevel, stressLevel, setStressLevel,
    sleepQuality, setSleepQuality, sleepCapturedToday,
    mealSchedule, mealResponses, setMealResponse, mealsTakenLockedToday,
    bathTaken, setBathTaken, bathLockedToday,
    selectedTags, toggleTag, pressureLabel, schoolTagCount,
    notes, setNotes, setJournalEdited, journalImage, setJournalImage,
    isSubmitting, handleAIEmotionDetected, clearDetectedEmotions,
    handleManualEmotionToggle, handleSubmit,
  } = useMoodCheckIn({
    onMoodLogged: () => { if (onMoodLogged) onMoodLogged() },
    onBackgroundChange,
  })

  const moodAccent = useMemo(() => {
    if (selectedEmotions.length === 0) return null
    return getBlendedColorWeighted(
      selectedEmotions.map((e) => ({ color: e.color, confidence: Math.max(0.05, e.confidence || 1) }))
    )
  }, [selectedEmotions])

  const aiDetectedReady = moodInputMode === 'selfie' && detectionMethod === 'selfie_ai' && selectedEmotions.length > 0

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

  const handleClose = () => {
    setIsModalOpen(false)
    if (currentStep === 4) window.location.reload()
  }

  const progress = (currentStep / totalSteps) * 100

  return (
    <>
      {/* Dashboard widget (inline — ~25 lines) */}
      <div className="card-aurora p-5">
        <h3 className="text-lg font-semibold mb-4 text-white text-center">How are you feeling?</h3>
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {MANUAL_EMOTIONS.map(emotion => (
            <button
              key={emotion.name}
              onClick={() => startCheckIn(emotion.name)}
              className="group flex flex-col items-center gap-2 transition-all hover:scale-110 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors shadow-lg overflow-hidden">
                <MoodIcon name={emotion.name as MoodIconName} size={40} ariaLabel={emotion.label} />
              </div>
              <span className="text-[10px] text-aurora-text-sec group-hover:text-white transition-colors">
                {emotion.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wizard modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="bg-[#0f0f11] w-full max-w-xl h-[90vh] sm:h-[85vh] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300 transition-shadow"
            style={
              moodAccent
                ? { boxShadow: `0 0 0 1px ${getColorWithAlpha(moodAccent, 0.28)}, 0 24px 48px -12px rgba(0,0,0,0.55)` }
                : undefined
            }
          >
            {/* Header + Progress */}
            {currentStep < 4 && (
              <div className="px-5 pt-5 pb-3 border-b border-white/5 bg-[#0f0f11] z-10">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={currentStep === 1 ? handleClose : handleBack}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {currentStep === 1
                      ? <X className="w-5 h-5 text-aurora-text-sec" />
                      : <ChevronLeft className="w-5 h-5 text-white" />}
                  </button>
                  <span className="text-sm font-semibold text-aurora-text-sec tracking-wider uppercase">
                    Step {currentStep} of {totalSteps - 1}
                  </span>
                  <div className="w-9" />
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${moodAccent ? '' : 'bg-linear-to-r from-aurora-blue to-aurora-purple'}`}
                    style={{
                      width: `${progress}%`,
                      ...(moodAccent ? { background: `linear-gradient(90deg, ${moodAccent} 0%, #7C3AED 100%)` } : {}),
                    }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable step content */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {currentStep === 1 && (
                <StepMoodSelection
                  selectedEmotions={selectedEmotions}
                  moodInputMode={moodInputMode}
                  setMoodInputMode={setMoodInputMode}
                  aiDetectedReady={aiDetectedReady}
                  intensity={intensity}
                  setIntensity={setIntensity}
                  durationMinutes={durationMinutes}
                  setDurationMinutes={setDurationMinutes}
                  handleAIEmotionDetected={handleAIEmotionDetected}
                  handleManualEmotionToggle={handleManualEmotionToggle}
                  activeHint={activeHint}
                  onHintToggle={setActiveHint}
                  moodAccent={moodAccent}
                />
              )}
              {currentStep === 2 && (
                <StepVitals
                  energyLevel={energyLevel}
                  setEnergyLevel={setEnergyLevel}
                  stressLevel={stressLevel}
                  setStressLevel={setStressLevel}
                  sleepQuality={sleepQuality}
                  setSleepQuality={setSleepQuality}
                  sleepCapturedToday={sleepCapturedToday}
                  mealSchedule={mealSchedule}
                  mealResponses={mealResponses}
                  setMealResponse={setMealResponse}
                  mealsTakenLockedToday={mealsTakenLockedToday}
                  bathTaken={bathTaken}
                  setBathTaken={setBathTaken}
                  bathLockedToday={bathLockedToday}
                  activeHint={activeHint}
                  onHintToggle={setActiveHint}
                />
              )}
              {currentStep === 3 && (
                <StepContext
                  selectedTags={selectedTags}
                  toggleTag={toggleTag}
                  pressureLabel={pressureLabel}
                  notes={notes}
                  setNotes={setNotes}
                  setJournalEdited={setJournalEdited}
                  journalImage={journalImage}
                  setJournalImage={setJournalImage}
                  activeHint={activeHint}
                  onHintToggle={setActiveHint}
                />
              )}
              {currentStep === 4 && (
                <StepSummary
                  schoolTagCount={schoolTagCount}
                  onCloseModal={() => setIsModalOpen(false)}
                />
              )}
            </div>

            {/* Footer */}
            <WizardFooter
              currentStep={currentStep}
              aiDetectedReady={aiDetectedReady}
              hasEmotions={selectedEmotions.length > 0}
              sleepCapturedToday={sleepCapturedToday}
              hasSleepQuality={!!sleepQuality}
              isSubmitting={isSubmitting}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
              handleClose={handleClose}
              clearDetectedEmotions={clearDetectedEmotions}
            />
          </div>
        </div>
      )}
    </>
  )
}