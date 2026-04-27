import { useNavigate } from 'react-router-dom'
import { EmotionDetection } from '../../components/EmotionDetection'
import { ArrowLeft } from 'lucide-react'
import type { DetectedEmotion } from '../../types/mood.types'

export default function DailySelfie() {
  const navigate = useNavigate()

  const handleEmotionDetected = (emotions: DetectedEmotion[]) => {
    // The EmotionDetection component manages its own state and "Save" button.
    // We can just log it here or perform side effects if needed.
    console.log('Emotions detected:', emotions)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-aurora-text-sec hover:text-white transition-all cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            Daily Selfie
          </h2>
          <p className="text-sm text-aurora-text-sec mt-1">
            Capture your emotion to log how you are feeling right now.
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <EmotionDetection onEmotionDetected={handleEmotionDetected} />
      </div>
    </div>
  )
}