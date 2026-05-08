import { useMemo, useState } from 'react'
import { Wind } from 'lucide-react'
import {
  BREATHING_EXERCISES,
  DURATION_OPTIONS_MINUTES,
  type BreathingExerciseData,
  type DurationOptionMinutes,
} from '../../constants/zen/exercises'
import { BreathingExercise } from '../../components/student/BreathingExercise'

export default function StudentResources() {
  const [selectedDuration, setSelectedDuration] = useState<DurationOptionMinutes>(3)
  const [activeExercise, setActiveExercise] = useState<BreathingExerciseData | null>(null)

  const durationSeconds = useMemo(() => selectedDuration * 60, [selectedDuration])

  if (activeExercise) {
    return (
      <BreathingExercise
        exercise={activeExercise}
        durationSeconds={durationSeconds}
        sessionLabel={`${selectedDuration} min session`}
        onClose={() => setActiveExercise(null)}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-aurora-primary-dark font-heading">
          Zen
        </h2>
        <p className="text-sm text-aurora-gray-500 mt-1">
          Pick a breathing practice and pace your nervous system in real time.
        </p>
      </div>

      {/* Duration */}
      <div className="card-aurora">
        <p className="text-sm font-bold text-aurora-primary-dark mb-2">Duration</p>
        <div className="flex gap-2">
          {DURATION_OPTIONS_MINUTES.map(minutes => {
            const selected = selectedDuration === minutes
            return (
              <button
                key={minutes}
                onClick={() => setSelectedDuration(minutes)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold border transition-colors cursor-pointer ${
                  selected
                    ? 'border-aurora-secondary-blue bg-aurora-secondary-blue/20 text-white'
                    : 'border-aurora-border bg-aurora-card-alt text-aurora-gray-500 hover:text-aurora-primary-dark'
                }`}
              >
                {minutes} min
              </button>
            )
          })}
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {BREATHING_EXERCISES.map(exercise => (
          <button
            key={exercise.id}
            onClick={() => setActiveExercise(exercise)}
            className="card-aurora w-full text-left hover:border-aurora-border-light transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-aurora-secondary-blue/24 flex items-center justify-center shrink-0">
                <Wind className="w-4.5 h-4.5 text-[#9EC2FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-extrabold text-white">{exercise.name}</p>
                <p className="text-xs text-[#B7C8ED] mt-0.5">{exercise.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {exercise.primaryMoodTargets.map(target => (
                <span
                  key={`${exercise.id}-${target}`}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#D7C6FF] bg-aurora-purple/18"
                >
                  {target}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#9BB0DC]">
              Pattern:{' '}
              {exercise.phases.map(p => `${p.label} ${p.seconds}s`).join(' • ')}
            </p>
            <p className="text-[11px] text-[#8FB4FF] mt-1.5">
              Audio: {exercise.soundscapeName}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}