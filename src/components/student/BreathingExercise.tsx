import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Info, Wind, RotateCcw } from 'lucide-react'
import { zenSoundsService, ZEN_TRACKS, TITLE_OVERRIDES } from '../../services/zen-sounds'

const BREATHING_PHASES = [
  { name: 'Inhale', instruction: 'Deeply through your nose', duration: 4 },
  { name: 'Hold', instruction: 'Hold your breath gently', duration: 4 },
  { name: 'Exhale', instruction: 'Slowly through your mouth', duration: 6 },
]

const TOTAL_DURATION = 4 * 60 + 52

const AMBIENT_LABELS: Record<string, string> = {
  Meditation: 'Peaceful Calm',
  Focus: 'Rain & Focus',
  Sleep: 'Night Rest',
}
const AMBIENT_EMOJI: Record<string, string> = {
  Meditation: '🌊',
  Focus: '🌲',
  Sleep: '🌙',
}

interface ResourceItem {
  id: string
  title: string
  category: string
  duration: string
  type: string
  image: string
}

interface BreathingExerciseProps {
  resource: ResourceItem
  onBack: () => void
}

export function BreathingExercise({ resource, onBack }: BreathingExerciseProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [totalTime, setTotalTime] = useState(TOTAL_DURATION)
  const [ambientOn, setAmbientOn] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentPhase = BREATHING_PHASES[phaseIdx]
  const resourceType = resource.type ?? 'Meditation'

  // Ambient Audio Logic
  useEffect(() => {
    if (ambientOn) {
      if (isPlaying) {
        // Check for a specific title override first (just like mobile)
        const track = TITLE_OVERRIDES[resource.title] || 
                      ZEN_TRACKS.find(t => t.category.toLowerCase() === resourceType.toLowerCase()) || 
                      ZEN_TRACKS[0]
        zenSoundsService.play(track)
      } else {
        zenSoundsService.pause()
      }
    } else {
      zenSoundsService.stop()
    }
  }, [ambientOn, isPlaying, resourceType, resource.title])

  // Cleanup audio when user leaves the breathing exercise
  useEffect(() => {
    return () => zenSoundsService.stop()
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      setTotalTime(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    const timeout = setTimeout(() => {
      setPhaseIdx(i => (i + 1) % BREATHING_PHASES.length)
    }, currentPhase.duration * 1000)
    return () => clearTimeout(timeout)
  }, [phaseIdx, isPlaying, currentPhase.duration])

  const reset = () => {
    setIsPlaying(false)
    setPhaseIdx(0)
    setTotalTime(TOTAL_DURATION)
    setTimeout(() => setIsPlaying(true), 100)
  }

  const circleScale = phaseIdx === 0 ? 1.15 : phaseIdx === 2 ? 0.88 : 1
  const minutes = Math.floor(totalTime / 60).toString().padStart(2, '0')
  const seconds = (totalTime % 60).toString().padStart(2, '0')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5.5 h-5.5 text-aurora-primary-dark" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-aurora-primary-dark">Breathing Space</p>
          <p className="text-[11px] tracking-widest text-aurora-gray-500 uppercase">Aurora Mindfulness</p>
        </div>
        <button className="p-1 cursor-pointer hover:opacity-70 transition-opacity" aria-label="Info">
          <Info className="w-5.5 h-5.5 text-aurora-gray-400" />
        </button>
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
                transition: `transform ${currentPhase.duration}s ease-in-out`,
              }}
            >
              <Wind className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-aurora-gray-400/30" />
      </div>

      {/* Phase Text */}
      <div className="text-center">
        <p className="text-4xl font-extrabold text-aurora-primary-dark mb-2">{currentPhase.name}</p>
        <p className="text-sm text-aurora-gray-500">{currentPhase.instruction}</p>
      </div>

      {/* Phase Tabs */}
      <div className="card-aurora p-1! flex">
        {BREATHING_PHASES.map((p, i) => (
          <button
            key={p.name}
            onClick={() => { setPhaseIdx(i) }}
            className={`flex-1 py-2.5 rounded-xl text-[13px] text-center transition-colors cursor-pointer ${
              phaseIdx === i
                ? 'bg-aurora-secondary-blue text-white font-bold'
                : 'text-aurora-gray-500 hover:text-aurora-primary-dark'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Ambient Sound Card */}
      <div className="card-aurora flex items-center gap-3">
        <div className="w-[42px] h-[42px] rounded-[10px] bg-aurora-secondary-blue/20 flex items-center justify-center shrink-0">
          <span className="text-xl">{AMBIENT_EMOJI[resourceType] ?? '🌲'}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-aurora-primary-dark">
            {AMBIENT_LABELS[resourceType] ?? 'Peaceful Forest'}
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
          onClick={() => setIsPlaying(p => !p)}
          className="flex-1 bg-aurora-secondary-blue text-white text-lg font-extrabold
                     rounded-2xl py-4.5 hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer"
        >
          {isPlaying ? 'Pause' : 'Resume'}
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