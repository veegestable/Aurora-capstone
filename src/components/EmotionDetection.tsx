import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Camera, Upload, Bot, Target, Check } from 'lucide-react'
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
      <h3 className="text-xl text-white font-semibold mb-4">AI Emotion Detection</h3>

      {!useCamera && !capturedImage && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-8 py-6 bg-[rgba(45,107,255,0.2)] border border-[rgba(45,107,255,0.35)] hover:bg-[rgba(45,107,255,0.3)] text-white font-medium text-base rounded-[14px] cursor-pointer transition-all hover:-translate-y-px hover:shadow-lg flex-col"
              disabled={isCapturing}
            >
              <Camera className="w-5 h-5 mb-1" />
              Take Selfie
              <span className="text-sm text-[#7B8EC8]">Use camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-8 py-6 bg-white/5 border border-white/8 hover:bg-white/10 text-white font-medium text-base rounded-[14px] cursor-pointer transition-all flex-col"
            >
              <Upload className="w-5 h-5 mb-1" />
              Upload Photo
              <span className="text-sm text-[#7B8EC8]">From gallery</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="p-4 bg-[rgba(45,107,255,0.12)] border border-[rgba(45,107,255,0.25)] rounded-[12px]">
            <p className="text-sm text-[#4D8BFF]">
              <strong>AI will detect:</strong> Multiple emotions, confidence levels, and assign mood colors for your calendar
            </p>
          </div>
        </div>
      )}

      {useCamera && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="rounded-[14px] shadow-md max-w-full border border-white/8"
              style={{ maxWidth: '400px' }}
            />
            <div className="absolute top-2 left-2 bg-[#EF4444] text-white px-2 py-1 rounded text-sm">
              🔴 Live
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={capturePhoto}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.3)] text-[#22C55E] font-semibold text-base rounded-[14px] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-[#7B8EC8] font-medium text-sm rounded-[14px] cursor-pointer transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="rounded-[14px] shadow-md max-w-full border border-white/8"
              style={{ maxWidth: '400px' }}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 rounded-[14px] flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="spinner mx-auto mb-2"></div>
                  <p className="flex items-center justify-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI is analyzing emotions...
                  </p>
                </div>
              </div>
            )}
          </div>

          {detectedEmotions.length > 0 && (
            <div className="w-full">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <Target className="w-4 h-4" />
                Detected Emotions:
              </h4>
              <div className="space-y-2">
                {detectedEmotions.map((emotion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/8 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: emotion.color }}
                      ></div>
                      <span className="font-medium capitalize text-white">{emotion.emotion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-white/8 rounded-full h-2">
                        <div
                          className="bg-[#2D6BFF] h-2 rounded-full"
                          style={{ width: `${emotion.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-[#7B8EC8]">
                        {Math.round(emotion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                setCapturedImage(null);
                setDetectedEmotions([]);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-[#7B8EC8] font-medium text-sm rounded-[14px] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Another
            </button>
            {detectedEmotions.length > 0 && (
              <button
                onClick={() => {
                  alert('Emotions saved to your mood log!');
                  setCapturedImage(null);
                  setDetectedEmotions([]);
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.3)] text-[#22C55E] font-semibold text-sm rounded-[14px] cursor-pointer transition-all"
              >
                <Check className="w-4 h-4 mr-2" />
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