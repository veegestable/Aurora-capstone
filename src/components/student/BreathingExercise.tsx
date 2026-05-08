import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Wind, RotateCcw } from 'lucide-react'
import { zenSoundsService } from '../../services/zen-sounds'
import {
  type BreathingExerciseData,
  getPhaseCycleDurationSeconds,
} from '../../constants/zen/exercises'

interface BreathingExerciseProps {
  exercise: BreathingExerciseData
  durationSeconds: number
  sessionLabel?: string
  onClose: () => void
}

export function BreathingExercise({
  exercise,
  durationSeconds,
  sessionLabel,
  onClose,
}: BreathingExerciseProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [totalTime, setTotalTime] = useState(durationSeconds)
  const [ambientOn, setAmbientOn] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentPhase = exercise.phases[phaseIdx]
  const cycleSeconds = getPhaseCycleDurationSeconds(exercise)

  useEffect(() => {
    if (!ambientOn) {
      zenSoundsService.stop()
      return
    }
    if (isPlaying) {
      zenSoundsService.play({
        id: exercise.id,
        title: exercise.soundscapeName,
        url: exercise.soundscapeUrl,
        volume: exercise.soundscapeVolume,
      })
    } else {
      zenSoundsService.pause()
    }
  }, [ambientOn, isPlaying, exercise])

  useEffect(() => () => zenSoundsService.stop(), [])

  useEffect(() => {
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      setTotalTime(prev => {
        if (prev <= 1) {
          setIsPlaying(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    const ms = Math.max(0, currentPhase?.seconds ?? 0) * 1000
    const timeout = setTimeout(() => {
      setPhaseIdx(i => (i + 1) % exercise.phases.length)
    }, ms)
    return () => clearTimeout(timeout)
  }, [phaseIdx, isPlaying, currentPhase, exercise.phases.length])

  const reset = () => {
    setIsPlaying(false)
    setPhaseIdx(0)
    setTotalTime(durationSeconds)
    setTimeout(() => setIsPlaying(true), 100)
  }

  const circleScale =
    currentPhase?.type === 'inhale' ? 1.15
      : currentPhase?.type === 'exhale' ? 0.88
      : 1
  const minutes = Math.floor(totalTime / 60).toString().padStart(2, '0')
  const seconds = (totalTime % 60).toString().padStart(2, '0')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5.5 h-5.5 text-aurora-primary-dark" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-aurora-primary-dark">{exercise.name}</p>
          <p className="text-[11px] tracking-widest text-aurora-gray-500 uppercase">
            {sessionLabel ?? 'Aurora Mindfulness'}
          </p>
        </div>
        <div className="w-7" />
      </div>

      {/* Timer */}
      <div className="flex gap-3">
        {[{ label: 'MINUTES', val: minutes }, { label: 'SECONDS', val: seconds }].map(t => (
          <div
            key={t.label}
            className="flex-1 bg-aurora-secondary-blue/15 border border-aurora-secondary-blue/30
                       rounded-2xl p-4 text-center"
          >
            <p className="text-[34px] font-extrabold text-aurora-primary-dark tabular-nums">
              {t.val}
            </p>
            <p className="text-[11px] tracking-wider text-aurora-gray-500 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Breathing Circle */}
      <div className="flex flex-col items-center py-4">
        <div
          className="w-[220px] h-[220px] rounded-full bg-aurora-secondary-blue/8
                     border border-aurora-secondary-blue/15
                     flex items-center justify-center"
        >
          <div
            className="w-[180px] h-[180px] rounded-full bg-aurora-secondary-blue/10
                       border border-aurora-secondary-blue/20
                       flex items-center justify-center"
          >
            <div
              className="w-[140px] h-[140px] rounded-full bg-aurora-secondary-blue
                         flex items-center justify-center shadow-aurora-lg"
              style={{
                transform: `scale(${isPlaying ? circleScale : 1})`,
                transition: `transform ${currentPhase?.seconds ?? 1}s ease-in-out`,
              }}
            >
              <Wind className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Phase Text */}
      <div className="text-center">
        <p className="text-4xl font-extrabold text-aurora-primary-dark mb-2">
          {currentPhase?.label ?? '—'}
        </p>
        <p className="text-sm text-aurora-gray-500">{currentPhase?.instruction ?? ''}</p>
      </div>

      {/* Phase Tabs (dynamic to exercise.phases) */}
      <div className="card-aurora p-1! flex gap-1">
        {exercise.phases.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setPhaseIdx(i)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] text-center transition-colors cursor-pointer ${
              phaseIdx === i
                ? 'bg-aurora-secondary-blue text-white font-bold'
                : 'text-aurora-gray-500 hover:text-aurora-primary-dark'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Pattern caption */}
      <p className="text-xs text-aurora-gray-500 text-center">
        Pattern: {exercise.phases.map(p => `${p.label} ${p.seconds}s`).join(' • ')}
        <span className="opacity-60"> · {Math.round(cycleSeconds)}s per cycle</span>
      </p>

      {/* Ambient Sound Card */}
      <div className="card-aurora flex items-center gap-3">
        <div className="w-[42px] h-[42px] rounded-[10px] bg-aurora-secondary-blue/20 flex items-center justify-center shrink-0">
          <Wind className="w-5 h-5 text-[#9EC2FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-aurora-primary-dark truncate">
            {exercise.soundscapeName}
          </p>
          <p className="text-xs text-aurora-gray-500">
            {ambientOn ? 'Ambient sound active' : 'Ambient sound off'}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={ambientOn}
            onChange={(e) => setAmbientOn(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 rounded-full transition-colors
                       bg-aurora-gray-300 peer-checked:bg-aurora-secondary-blue
                       after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                       after:bg-white after:rounded-full after:h-5 after:w-5
                       after:transition-transform peer-checked:after:translate-x-full"
          />
        </label>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            if (!isPlaying && totalTime === 0) {
              setTotalTime(durationSeconds)
              setPhaseIdx(0)
            }
            setIsPlaying(p => !p)
          }}
          className="flex-1 bg-aurora-secondary-blue text-white text-lg font-extrabold
                     rounded-2xl py-4.5 hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer"
        >
          {isPlaying ? 'Pause' : totalTime === 0 ? 'Restart' : 'Resume'}
        </button>
        <button
          onClick={reset}
          className="w-[60px] card-aurora p-0! flex items-center justify-center rounded-2xl
                     hover:bg-aurora-gray-100 transition-colors cursor-pointer"
          aria-label="Reset"
        >
          <RotateCcw className="w-5.5 h-5.5 text-aurora-gray-500" />
        </button>
      </div>
    </div>
  )
}