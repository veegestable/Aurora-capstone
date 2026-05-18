interface WizardStepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const STEPS = [
  { step: 1, label: 'Mood' },
  { step: 2, label: 'Vitals' },
  { step: 3, label: 'Context' },
] as const

export function WizardStepIndicator({ currentStep, totalSteps }: WizardStepIndicatorProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between gap-2">
        {STEPS.map(({ step, label }) => {
          const isCurrent = currentStep === step
          const isCompleted = currentStep > step
          return (
            <div key={step} className="flex flex-1 flex-col items-center min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border mb-1.5 transition-colors ${
                  isCurrent
                    ? 'bg-aurora-blue border-[rgba(140,177,255,0.7)] text-white shadow-[0_0_12px_rgba(45,107,255,0.35)]'
                    : isCompleted
                      ? 'bg-[rgba(45,107,255,0.2)] border-transparent text-[#BCD0FF]'
                      : 'bg-white/5 border-white/10 text-aurora-text-muted'
                }`}
              >
                {step}
              </div>
              <span
                className={`text-[11px] font-semibold truncate ${
                  isCurrent ? 'text-aurora-blue' : isCompleted ? 'text-[#AFC4F5]' : 'text-aurora-text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-3">
        <div
          className="h-full bg-aurora-blue transition-all duration-500 rounded-full"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
