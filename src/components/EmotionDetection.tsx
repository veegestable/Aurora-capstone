import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Camera, Upload, Bot, Target, Check, Sparkles } from 'lucide-react'
import type { DetectedEmotion } from '../types/mood.types'
import { EMOTION_COLORS } from '../utils/emotions'

interface EmotionDetectionProps {
  onEmotionDetected: (emotions: DetectedEmotion[]) => void
}

export function EmotionDetection({ onEmotionDetected }: EmotionDetectionProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [detectedEmotions, setDetectedEmotions] = useState<DetectedEmotion[]>([])
  const [useCamera, setUseCamera] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      setIsCapturing(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      })

      setMediaStream(stream)
      setUseCamera(true)
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }

    if (videoRef.current) videoRef.current.srcObject = null

    setIsCapturing(false)
    setUseCamera(false)
  }

  useEffect(() => {
    if (useCamera && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch(console.error)
    }
  }, [useCamera, mediaStream])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        analyzeEmotion(imageData)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        analyzeEmotion(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeEmotion = async (imageData: string) => {
    setIsAnalyzing(true)

    try {
      const mockEmotions = await mockEmotionAnalysis(imageData)
      setDetectedEmotions(mockEmotions)
      onEmotionDetected(mockEmotions)
    } catch (error) {
      console.error('Emotion analysis failed:', error)
      alert('Failed to analyze emotions. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const mockEmotionAnalysis = async (_imageData: string): Promise<DetectedEmotion[]> => {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const possibleEmotions = [
      { emotion: 'joy', confidence: Math.random() * 0.4 + 0.3, color: EMOTION_COLORS.joy },
      { emotion: 'sadness', confidence: Math.random() * 0.3 + 0.1, color: EMOTION_COLORS.sadness },
      { emotion: 'neutral', confidence: Math.random() * 0.5 + 0.2, color: EMOTION_COLORS.neutral },
      { emotion: 'surprise', confidence: Math.random() * 0.2 + 0.05, color: EMOTION_COLORS.surprise },
      { emotion: 'love', confidence: Math.random() * 0.3 + 0.1, color: EMOTION_COLORS.love }
    ]

    return possibleEmotions
      .filter(emotion => emotion.confidence > 0.15)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  return (
    <div className="card-aurora p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(124,58,237,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(45,107,255,0.1)]">
          <Sparkles className="w-[18px] h-[18px] text-aurora-blue" />
        </div>
        <h3 className="text-lg text-white font-semibold">AI Emotion Detection</h3>
      </div>

      {!useCamera && !capturedImage && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="group flex flex-col items-center gap-2 px-6 py-6 bg-[rgba(45,107,255,0.1)] border border-[rgba(45,107,255,0.25)] hover:bg-[rgba(45,107,255,0.18)] text-white font-medium rounded-[14px] cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_0_20px_rgba(45,107,255,0.15)]"
              disabled={isCapturing}
            >
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[rgba(45,107,255,0.3)] to-[rgba(45,107,255,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-aurora-blue" />
              </div>
              <span className="font-semibold">Take Selfie</span>
              <span className="text-xs text-aurora-text-sec">Use camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center gap-2 px-6 py-6 bg-white/3 border border-white/8 hover:bg-white/6 text-white font-medium rounded-[14px] cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-white/10 to-white/3 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-aurora-text-sec" />
              </div>
              <span className="font-semibold">Upload Photo</span>
              <span className="text-xs text-aurora-text-sec">From gallery</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex items-start gap-3 p-4 bg-[rgba(45,107,255,0.08)] border border-[rgba(45,107,255,0.2)] rounded-[12px]">
            <Bot className="w-4 h-4 text-aurora-blue shrink-0 mt-0.5" />
            <p className="text-sm text-aurora-blue">
              <strong>AI will detect:</strong> Multiple emotions, confidence levels, and assign mood colors for your calendar
            </p>
          </div>
        </div>
      )}

      {useCamera && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[400px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-[14px] shadow-aurora border border-white/8"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-aurora-red/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={capturePhoto}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.35)] hover:bg-[rgba(34,197,94,0.25)] text-aurora-green font-semibold rounded-[14px] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/8 hover:bg-white/10 text-aurora-text-sec font-medium rounded-[14px] cursor-pointer transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[400px]">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-[14px] shadow-aurora border border-white/8"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-aurora-bg/70 backdrop-blur-sm rounded-[14px] flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="spinner mx-auto mb-3"></div>
                  <p className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Bot className="w-4 h-4 text-aurora-blue" />
                    AI is analyzing emotions...
                  </p>
                </div>
              </div>
            )}
          </div>

          {detectedEmotions.length > 0 && (
            <div className="w-full">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <Target className="w-4 h-4 text-aurora-blue" />
                Detected Emotions:
              </h4>
              <div className="space-y-2">
                {detectedEmotions.map((emotion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/3 border border-white/8 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: emotion.color, boxShadow: `0 0 8px ${emotion.color}40` }}
                      />
                      <span className="font-medium capitalize text-white">{emotion.emotion}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 bg-white/8 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${emotion.confidence * 100}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                      <span className="text-sm font-medium text-aurora-text-sec w-9 text-right">
                        {Math.round(emotion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCapturedImage(null);
                setDetectedEmotions([]);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/8 hover:bg-white/10 text-aurora-text-sec font-medium text-sm rounded-[14px] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4" />
              Take Another
            </button>
            {detectedEmotions.length > 0 && (
              <button
                onClick={() => {
                  alert('Emotions saved to your mood log!');
                  setCapturedImage(null);
                  setDetectedEmotions([]);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.35)] hover:bg-[rgba(34,197,94,0.25)] text-aurora-green font-semibold text-sm rounded-[14px] cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                Save to Mood Log
              </button>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}