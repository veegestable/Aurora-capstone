import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Camera, Upload, Bot, Target, Check, Sparkles } from 'lucide-react'
import type { DetectedEmotion } from '../types/mood.types'
import { EMOTION_COLORS } from '../utils/emotions'

const EMOTION_API_URL = import.meta.env.VITE_EMOTION_API_URL

const getEmotionColor = (emotionName: string): string => {
  const normalized = emotionName.toLowerCase().trim()
  return EMOTION_COLORS[normalized] ?? '#808080'
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

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
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
      setIsCapturing(false)
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

  const analyzeEmotion = async (imageDataUrl: string) => {
    setIsAnalyzing(true)

    try {
      if (!EMOTION_API_URL) {
        throw new Error('Emotion API URL is not configured. Set VITE_EMOTION_API_URL in your .env file.')
      }

      const blob = await dataUrlToBlob(imageDataUrl)
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')

      const response = await fetch(`${EMOTION_API_URL}/api/emotion/analyze-upload`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`API Error: ${response.status} - ${text}`)
      }

      const result = await response.json()

      if (!result.success || !result.face_detected) {
        throw new Error(
          !result.face_detected
            ? 'No face detected in the image. Please try again with a clearer photo.'
            : result.error || 'Unknown API error'
        )
      }

      let emotions: DetectedEmotion[] = []

      if (result.emotions) {
        emotions = Object.entries(result.emotions).map(([emotion, score]) => ({
          emotion: emotion.toLowerCase(),
          confidence: (score as number) / 100,
          color: getEmotionColor(emotion),
        }))
      }

      const topEmotions = emotions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)

      setDetectedEmotions(topEmotions)
      onEmotionDetected(topEmotions)
    } catch (error) {
      console.error('Emotion analysis failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze emotions. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
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
                setCapturedImage(null)
                setDetectedEmotions([])
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/8 hover:bg-white/10 text-aurora-text-sec font-medium text-sm rounded-[14px] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4" />
              Take Another
            </button>
            {detectedEmotions.length > 0 && (
              <button
                onClick={() => {
                  setCapturedImage(null)
                  setDetectedEmotions([])
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