import { useEffect, useRef, useState } from 'react'
import { Wind, Play, Square } from 'lucide-react'

const PHASES = [
  { name: 'Inhale', duration: 4 },
  { name: 'Hold', duration: 4 },
  { name: 'Exhale', duration: 6 },
] as const

const TOTAL_SECONDS = 60

interface QuickResetBreathingProps {
  /** Optional callback fired when the 60s timer finishes naturally. */
  onComplete?: () => void
}

/**
 * Compact inline breathing exercise designed for the Mood Check-in "Done" step.
 * Runs for {@link TOTAL_SECONDS} seconds, cycling Inhale / Hold / Exhale, then
 * stops on its own. The student can also stop early with the button.
 */
export function QuickResetBreathing({ onComplete }: QuickResetBreathingProps) {
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(TOTAL_SECONDS)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const phase = PHASES[phaseIdx]
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 1Hz countdown — fires while the timer is running.
  useEffect(() => {
    if (!running) return
    tickRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [running])

  // Phase cycler — schedules the next phase using the current phase's duration.
  useEffect(() => {
    if (!running) return
    phaseRef.current = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length)
    }, phase.duration * 1000)
    return () => {
      if (phaseRef.current) clearTimeout(phaseRef.current)
    }
  }, [running, phaseIdx, phase.duration])

  // Stop naturally when the countdown reaches 0.
  useEffect(() => {
    if (!running || remaining > 0) return
    setRunning(false)
    onComplete?.()
  }, [running, remaining, onComplete])

  const start = () => {
    setRemaining(TOTAL_SECONDS)
    setPhaseIdx(0)
    setRunning(true)
  }

  const stop = () => {
    setRunning(false)
    setRemaining(TOTAL_SECONDS)
    setPhaseIdx(0)
  }

  const scale = phaseIdx === 0 ? 1.15 : phaseIdx === 2 ? 0.88 : 1

  return (
    <div className="card-aurora p-5 flex flex-col items-center gap-3 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-aurora-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-1.5 relative z-10">
        <Wind className="w-4 h-4 text-aurora-blue" />
        <h3 className="text-sm font-bold text-white tracking-wide">Quick Reset · 60s</h3>
      </div>

      <div className="relative z-10 w-32 h-32 rounded-full bg-aurora-blue/10 border border-aurora-blue/20 flex items-center justify-center">
        <div
          className="w-24 h-24 rounded-full bg-aurora-blue flex items-center justify-center shadow-[0_0_30px_rgba(45,107,255,0.45)]"
          style={{
            transform: `scale(${running ? scale : 1})`,
            transition: `transform ${phase.duration}s ease-in-out`,
          }}
        >
          <Wind className="w-8 h-8 text-white" />
        </div>
      </div>

      <p className="text-xl font-extrabold text-white relative z-10">
        {running ? phase.name : 'Ready when you are'}
      </p>
      <p className="text-xs text-aurora-text-muted relative z-10">
        {running ? `${remaining}s remaining` : 'A 60-second breathing reset'}
      </p>

      {!running ? (
        <button
          type="button"
          onClick={start}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aurora-blue hover:bg-aurora-blue-light text-white text-sm font-bold shadow-[0_0_20px_rgba(45,107,255,0.3)] cursor-pointer transition-colors"
        >
          <Play className="w-4 h-4" />
          Start
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold cursor-pointer transition-colors"
        >
          <Square className="w-4 h-4" />
          Stop
        </button>
      )}
    </div>
  )
}