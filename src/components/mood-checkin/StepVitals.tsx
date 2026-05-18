import React from 'react'
import {
  Zap, Frown, BedDouble, Droplets,
  UtensilsCrossed, Check, X, CheckCircle2,
} from 'lucide-react'
import type { SleepQuality } from '../../services/mood/types'
import type { MealScheduleItem } from '../../types/user-settings.types'
import { HintButton, HintPanel, type HintKey } from './HintSystem'

interface StepVitalsProps {
  energyLevel: number
  setEnergyLevel: (v: number) => void
  stressLevel: number
  setStressLevel: (v: number) => void
  sleepQuality: SleepQuality | null
  setSleepQuality: (q: SleepQuality) => void
  sleepCapturedToday: boolean
  mealSchedule: readonly MealScheduleItem[]
  mealResponses: Record<string, boolean>
  setMealResponse: (mealId: string, taken: boolean) => void
  mealsTakenLockedToday: Set<string>
  bathTaken: boolean | null
  setBathTaken: (v: boolean) => void
  bathLockedToday: boolean
  activeHint: HintKey
  onHintToggle: (next: HintKey) => void
}

export function StepVitals({
  energyLevel, setEnergyLevel, stressLevel, setStressLevel,
  sleepQuality, setSleepQuality, sleepCapturedToday,
  mealSchedule, mealResponses, setMealResponse, mealsTakenLockedToday,
  bathTaken, setBathTaken, bathLockedToday,
  activeHint, onHintToggle,
}: StepVitalsProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">Check your vitals</h2>
        <p className="text-sm text-aurora-text-sec">How are your physical levels today?</p>
      </div>

      {/* Energy */}
      <div className="card-aurora p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(34,197,94,0.15)]">
              <Zap className="w-5 h-5 text-aurora-green" />
            </div>
            <h3 className="font-semibold text-white">Energy Level</h3>
            <HintButton hint="energy" active={activeHint} onToggle={onHintToggle} ariaLabel="Energy hint" />
          </div>
          <span className="text-base font-extrabold text-aurora-green tabular-nums">
            {energyLevel}<span className="text-aurora-text-muted text-xs font-semibold">/5</span>
          </span>
        </div>
        <input
          type="range" min={1} max={5} step={1} value={energyLevel}
          onChange={(e) => setEnergyLevel(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none bg-white/10 cursor-pointer vital-range-slider mb-2"
          style={{ ['--thumb-vital']: '#22C55E' } as React.CSSProperties}
          aria-label="Energy level"
        />
        <div className="flex justify-between text-xs font-medium text-aurora-text-muted">
          <span>Exhausted</span><span>Energized</span>
        </div>
      </div>
      {activeHint === 'energy' && <HintPanel hint="energy" onClose={() => onHintToggle(null)} />}

      {/* Stress */}
      <div className="card-aurora p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(249,0,56,0.15)]">
              <Frown className="w-5 h-5 text-aurora-red" />
            </div>
            <h3 className="font-semibold text-white">Stress Level</h3>
            <HintButton hint="stress" active={activeHint} onToggle={onHintToggle} ariaLabel="Stress hint" />
          </div>
          <span className="text-base font-extrabold text-aurora-red tabular-nums">
            {stressLevel}<span className="text-aurora-text-muted text-xs font-semibold">/5</span>
          </span>
        </div>
        <input
          type="range" min={1} max={5} step={1} value={stressLevel}
          onChange={(e) => setStressLevel(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none bg-white/10 cursor-pointer vital-range-slider mb-2"
          style={{ ['--thumb-vital']: '#EF4444' } as React.CSSProperties}
          aria-label="Stress level"
        />
        <div className="flex justify-between text-xs font-medium text-aurora-text-muted">
          <span>Relaxed</span><span>Overwhelmed</span>
        </div>
      </div>
      {activeHint === 'stress' && <HintPanel hint="stress" onClose={() => onHintToggle(null)} />}

      {/* Sleep Quality */}
      <div className="card-aurora p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[rgba(146,15,254,0.15)]">
            <BedDouble className="w-5 h-5 text-aurora-purple" />
          </div>
          <h3 className="font-semibold text-white">Sleep Quality</h3>
          <HintButton hint="sleep" active={activeHint} onToggle={onHintToggle} ariaLabel="Sleep hint" />
        </div>
        {sleepCapturedToday ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-aurora-green" />
            <span className="text-sm font-medium text-aurora-text-sec">
              Already logged today — locked until tomorrow.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'poor', emoji: '😴', label: 'Poor' },
              { key: 'fair', emoji: '😐', label: 'Fair' },
              { key: 'good', emoji: '😊', label: 'Good' },
            ]).map((q) => (
              <button
                key={q.key}
                onClick={() => setSleepQuality(q.key as SleepQuality)}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all cursor-pointer ${
                  sleepQuality === q.key
                    ? 'bg-[rgba(146,15,254,0.2)] border-aurora-purple shadow-[0_0_15px_rgba(146,15,254,0.2)]'
                    : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
                }`}
                aria-pressed={sleepQuality === q.key}
              >
                <span className="text-2xl">{q.emoji}</span>
                <span className={`text-sm font-medium ${sleepQuality === q.key ? 'text-white' : ''}`}>{q.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {activeHint === 'sleep' && <HintPanel hint="sleep" onClose={() => onHintToggle(null)} />}

      {/* Meal check-ins */}
      <div className="card-aurora p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[rgba(254,189,3,0.15)]">
            <UtensilsCrossed className="w-5 h-5 text-aurora-amber" />
          </div>
          <h3 className="font-semibold text-white">Meal Check-in</h3>
          <HintButton hint="meal" active={activeHint} onToggle={onHintToggle} ariaLabel="Meal hint" />
        </div>
        <div className="space-y-2.5">
          {mealSchedule.map((meal) => {
            const takenLocked = mealsTakenLockedToday.has(meal.id)
            const choice = mealResponses[meal.id]
            const yesActive = takenLocked || choice === true
            const noActive = !takenLocked && choice === false
            return (
              <div
                key={meal.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  takenLocked ? 'bg-white/0.02 border-white/5' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${takenLocked ? 'text-aurora-text-muted' : 'text-white'}`}>
                    {meal.label}
                  </p>
                  <p className="text-[11px] font-medium text-aurora-text-muted">
                    {takenLocked ? 'Taken — saved for today' : `Around ${meal.time}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button" disabled={takenLocked} aria-pressed={yesActive}
                    aria-label={`${meal.label} taken`}
                    onClick={() => setMealResponse(meal.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      yesActive
                        ? 'bg-[rgba(34,197,94,0.2)] border-[rgba(34,197,94,0.4)] text-aurora-green'
                        : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
                    }`}
                  >
                    Taken
                  </button>
                  <button
                    type="button" disabled={takenLocked} aria-pressed={noActive}
                    aria-label={`${meal.label} not yet`}
                    onClick={() => setMealResponse(meal.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      noActive
                        ? 'bg-[rgba(245,158,11,0.18)] border-[rgba(245,158,11,0.45)] text-aurora-amber'
                        : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
                    }`}
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {activeHint === 'meal' && <HintPanel hint="meal" onClose={() => onHintToggle(null)} />}

      {/* Bath check-in */}
      <div className="card-aurora p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[rgba(45,107,255,0.15)]">
            <Droplets className="w-5 h-5 text-aurora-blue" />
          </div>
          <h3 className="font-semibold text-white">Bath Check-in</h3>
          <HintButton hint="bath" active={activeHint} onToggle={onHintToggle} ariaLabel="Bath hint" />
        </div>
        {bathLockedToday ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-aurora-green" />
            <span className="text-sm font-medium text-aurora-text-sec">
              Already confirmed today — locked until tomorrow.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button" onClick={() => setBathTaken(true)} aria-pressed={bathTaken === true}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors cursor-pointer ${
                bathTaken === true
                  ? 'bg-[rgba(34,197,94,0.2)] border-[rgba(34,197,94,0.4)] text-aurora-green'
                  : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
              }`}
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-bold">Yes, I did</span>
            </button>
            <button
              type="button" onClick={() => setBathTaken(false)} aria-pressed={bathTaken === false}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors cursor-pointer ${
                bathTaken === false
                  ? 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-aurora-red'
                  : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
              }`}
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-bold">Not yet</span>
            </button>
          </div>
        )}
      </div>
      {activeHint === 'bath' && <HintPanel hint="bath" onClose={() => onHintToggle(null)} />}
    </div>
  )
}