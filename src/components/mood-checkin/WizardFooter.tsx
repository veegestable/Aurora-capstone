import { ChevronRight, RefreshCw, Check } from 'lucide-react'

interface WizardFooterProps {
  currentStep: number
  aiDetectedReady: boolean
  hasEmotions: boolean
  sleepCapturedToday: boolean
  hasSleepQuality: boolean
  isSubmitting: boolean
  handleNext: () => void
  handleSubmit: () => void
  handleClose: () => void
  clearDetectedEmotions: () => void
}

export function WizardFooter({
  currentStep, aiDetectedReady, hasEmotions,
  sleepCapturedToday, hasSleepQuality, isSubmitting,
  handleNext, handleSubmit, handleClose, clearDetectedEmotions,
}: WizardFooterProps) {
  if (currentStep === 1 && aiDetectedReady) {
    return (
      <div className="p-5 border-t border-white/5 bg-[#0a0a0a]">
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
      </div>
    )
  }

  if (currentStep < 4) {
    const isDisabled =
      (currentStep === 1 && !hasEmotions) ||
      (currentStep === 2 && !sleepCapturedToday && !hasSleepQuality) ||
      isSubmitting

    return (
      <div className="p-5 border-t border-white/5 bg-[#0a0a0a]">
        <button
          onClick={currentStep === 3 ? handleSubmit : handleNext}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 bg-aurora-blue hover:bg-aurora-blue-light text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(45,107,255,0.2)] cursor-pointer"
        >
          {isSubmitting ? 'Saving...' : currentStep === 3 ? 'Save Check-in' : 'Continue'}
          {!isSubmitting && currentStep < 3 && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 border-t border-white/5 bg-[#0a0a0a]">
      <button
        onClick={handleClose}
        className="w-full bg-linear-to-r from-aurora-blue to-aurora-purple hover:opacity-90 text-white py-4 rounded-xl font-bold text-base transition-all shadow-[0_0_25px_rgba(124,58,237,0.3)] cursor-pointer"
      >
        Done
      </button>
    </div>
  )
}