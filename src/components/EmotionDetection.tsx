import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, Upload, Bot, Target, Check } from 'lucide-react';

interface DetectedEmotion {
  emotion: string;
  confidence: number;
  color: string;
}

interface EmotionDetectionProps {
  onEmotionDetected: (emotions: DetectedEmotion[]) => void;
}

const EMOTION_COLORS = {
  joy: '#FFD700',
  love: '#FF69B4',
  surprise: '#FF8C00',
  anger: '#DC143C',
  fear: '#8A2BE2',
  sadness: '#4169E1',
  disgust: '#32CD32',
  neutral: '#808080'
};

export function EmotionDetection({ onEmotionDetected }: EmotionDetectionProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedEmotions, setDetectedEmotions] = useState<DetectedEmotion[]>([]);
  const [useCamera, setUseCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        analyzeEmotion(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        analyzeEmotion(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeEmotion = async (imageData: string) => {
    setIsAnalyzing(true);

    try {
      // Mock AI emotion detection (replace with actual AI service)
      const mockEmotions = await mockEmotionAnalysis(imageData);
      setDetectedEmotions(mockEmotions);
      onEmotionDetected(mockEmotions);
    } catch (error) {
      console.error('Emotion analysis failed:', error);
      alert('Failed to analyze emotions. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mock emotion analysis (replace with actual AI service like Azure Face API or AWS Rekognition)
  const mockEmotionAnalysis = async (_imageData: string): Promise<DetectedEmotion[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock multiple emotions with varying confidence
    const possibleEmotions = [
      { emotion: 'joy', confidence: Math.random() * 0.4 + 0.3, color: EMOTION_COLORS.joy },
      { emotion: 'sadness', confidence: Math.random() * 0.3 + 0.1, color: EMOTION_COLORS.sadness },
      { emotion: 'neutral', confidence: Math.random() * 0.5 + 0.2, color: EMOTION_COLORS.neutral },
      { emotion: 'surprise', confidence: Math.random() * 0.2 + 0.05, color: EMOTION_COLORS.surprise },
      { emotion: 'love', confidence: Math.random() * 0.3 + 0.1, color: EMOTION_COLORS.love }
    ];

    // Return emotions above confidence threshold
    return possibleEmotions
      .filter(emotion => emotion.confidence > 0.15)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Max 3 emotions
  };

  return (
    <div className="card">
      <h3 className="text-xl text-aurora-primary-light font-semibold mb-4">AI Emotion Detection</h3>

      {!useCamera && !capturedImage && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="btn btn-primary btn-lg flex-col py-6"
              disabled={isCapturing}
            >
              <Camera className="w-5 h-5 mb-1" />
              Take Selfie
              <span className="text-sm opacity-80">Use camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-lg flex-col py-6"
            >
              <Upload className="w-5 h-5 mb-1" />
              Upload Photo
              <span className="text-sm opacity-80">From gallery</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
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
              className="rounded-lg shadow-md max-w-full"
              style={{ maxWidth: '400px' }}
            />
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
              🔴 Live
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={capturePhoto}
              className="btn btn-success btn-lg"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
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
              className="rounded-lg shadow-md max-w-full"
              style={{ maxWidth: '400px' }}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
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
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Detected Emotions:
              </h4>
              <div className="space-y-2">
                {detectedEmotions.map((emotion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: emotion.color }}
                      ></div>
                      <span className="font-medium capitalize">{emotion.emotion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${emotion.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
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
              className="btn btn-secondary"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Another
            </button>
            {detectedEmotions.length > 0 && (
              <button
                onClick={() => {
                  // This will be handled by parent component
                  alert('Emotions saved to your mood log!');
                  setCapturedImage(null);
                  setDetectedEmotions([]);
                }}
                className="btn btn-success"
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
  );
}