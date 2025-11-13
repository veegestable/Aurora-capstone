import { useState, useEffect } from 'react';
import { EmotionDetection } from './EmotionDetection';
import { moodService } from '../services/mood.service';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Frown, Target } from 'lucide-react';

interface DetectedEmotion {
  emotion: string;
  confidence: number;
  color: string;
}

interface MoodCheckInProps {
  onMoodLogged?: () => void;
  onBackgroundChange?: (background: string | undefined) => void;
}

const MANUAL_EMOTIONS = [
  { name: 'joy',  color: '#FFA900', label: 'Joy', emoji: '😊' },
  { name: 'love',  color: '#FF55B8', label: 'Love', emoji: '🥰' },
  { name: 'surprise',  color: '#FF7105', label: 'Surprise', emoji: '😮' },
  { name: 'anger',  color: '#F90038', label: 'Anger', emoji: '😡' },
  { name: 'fear',  color: '#920FFE', label: 'Fear', emoji: '😰' },
  { name: 'sadness',  color: '#086FE6', label: 'Sadness', emoji: '😢' },
  { name: 'disgust',  color: '#19BF20', label: 'Disgust', emoji: '🤢' },
  { name: 'neutral',  color: '#CAC1C4', label: 'Neutral', emoji: '😐' }
];

export function MoodCheckIn({ onMoodLogged, onBackgroundChange }: MoodCheckInProps) {
  const { user } = useAuth();
  const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([]);
  const [notes, setNotes] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(3);

  // Update background when emotions change
  useEffect(() => {
    if (onBackgroundChange) {
      const background = selectedEmotions.length > 0 
        ? `linear-gradient(135deg, ${getBlendedColorWithAlpha(0.15)}, ${getBlendedColorWithAlpha(0.05)})`
        : undefined;
      onBackgroundChange(background);
    }
  }, [selectedEmotions, onBackgroundChange]);

  const handleAIEmotionDetected = (emotions: DetectedEmotion[]) => {
    setSelectedEmotions(emotions);
    setIsManualMode(false);
  };

  const handleManualEmotionToggle = (emotion: typeof MANUAL_EMOTIONS[0]) => {
    const existing = selectedEmotions.find(e => e.emotion === emotion.name);
    
    if (existing) {
      // Remove emotion
      setSelectedEmotions(prev => prev.filter(e => e.emotion !== emotion.name));
    } else {
      // Add emotion with default confidence
      const newEmotion: DetectedEmotion = {
        emotion: emotion.name,
        confidence: 0.7, // Default confidence for manual selection
        color: emotion.color
      };
      setSelectedEmotions(prev => [...prev, newEmotion]);
    }
  };

  const adjustEmotionIntensity = (emotionName: string, delta: number) => {
    setSelectedEmotions(prev => 
      prev.map(emotion => 
        emotion.emotion === emotionName
          ? { ...emotion, confidence: Math.max(0.1, Math.min(1, emotion.confidence + delta)) }
          : emotion
      )
    );
  };

  const getBlendedColor = () => {
    if (selectedEmotions.length === 0) return '#f3f4f6';
    if (selectedEmotions.length === 1) return selectedEmotions[0].color;

    // Calculate weighted average color
    let totalWeight = 0;
    let r = 0, g = 0, b = 0;
    
    selectedEmotions.forEach(emotion => {
      const weight = emotion.confidence;
      const color = hexToRgb(emotion.color);
      if (color) {
        r += color.r * weight;
        g += color.g * weight;
        b += color.b * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight === 0) return '#f3f4f6';
    
    r = Math.round(r / totalWeight);
    g = Math.round(g / totalWeight);
    b = Math.round(b / totalWeight);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getBlendedColorWithAlpha = (alpha: number) => {
    if (selectedEmotions.length === 0) return `rgba(243, 244, 246, ${alpha})`;
    
    const color = getBlendedColor();
    // Convert rgb() to rgba() with alpha
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // If it's already a hex, convert to rgba
    const hexColor = hexToRgb(color);
    if (hexColor) {
      return `rgba(${hexColor.r}, ${hexColor.g}, ${hexColor.b}, ${alpha})`;
    }
    
    return `rgba(243, 244, 246, ${alpha})`;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const handleSubmit = async () => {
    console.log('=== MOOD SUBMIT DEBUG ===');
    console.log('Selected emotions:', selectedEmotions);
    console.log('Current user:', user);
    console.log('User ID:', user?.id);
    console.log('Auth token in localStorage:', localStorage.getItem('token'));

    if (selectedEmotions.length === 0) {
      alert('Please select at least one emotion or use AI detection');
      return;
    }

    if (!user) {
      alert('Please log in to save your mood');
      return;
    }

    try {
      setIsSubmitting(true);

      const moodData = {
        emotions: selectedEmotions,
        notes: notes.trim(),
        log_date: new Date().toISOString(),
        energy_level: energyLevel,
        stress_level: stressLevel,
        detection_method: isManualMode ? 'manual' : 'ai'
      };

      console.log('Mood data to send:', moodData);

      const result = await moodService.createMoodLog(moodData);
      console.log('Mood log result:', result);
      
      // Reset form
      setSelectedEmotions([]);
      setNotes('');
      setEnergyLevel(5);
      setStressLevel(3);
      setIsManualMode(false);
      
      if (onMoodLogged) {
        onMoodLogged();
      }

      alert('🎉 Mood logged successfully!');
    } catch (error) {
      console.error('=== MOOD SUBMIT ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to log mood: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="mood-checkin-container transition-all duration-500 overflow-y-auto lg:overflow-y-visible"
    >
      <div className="max-w-4xl mx-auto p-3 lg:p-4 min-h-full lg:min-h-0 lg:pb-0 pb-6">
      <div className="text-center mb-3 lg:mb-4">
        <h1 className="text-xl lg:text-2xl font-bold text-aurora-primary-dark mb-1">Daily Mood Check-In</h1>
        <p className="text-sm text-aurora-primary-dark/70">How are you feeling today? Let's capture your emotions.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-3 lg:mb-4">
        <div className="flex bg-aurora-primary-light/20 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={() => setIsManualMode(false)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              !isManualMode 
                ? 'bg-white shadow-aurora text-aurora-secondary-blue' 
                : 'text-aurora-primary-dark/70 hover:text-aurora-primary-dark'
            }`}
          >
            AI Detection
          </button>
          <button
            onClick={() => setIsManualMode(true)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              isManualMode 
                ? 'bg-white shadow-aurora text-aurora-secondary-blue' 
                : 'text-aurora-primary-dark/70 hover:text-aurora-primary-dark'
            }`}
          >
            Manual Selection
          </button>
        </div>
      </div>

      {/* Single column layout following mobile flow */}
      <div className="space-y-3 lg:space-y-4">
        {/* AI Emotion Detection */}
        {!isManualMode && (
          <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
        )}

        {/* Manual Emotion Selection */}
        {isManualMode && (
          <div className="card-aurora">
            <h3 className="text-lg font-semibold mb-4 text-aurora-primary-dark text-center">How are you feeling today?</h3>
            <div className="grid grid-cols-4 gap-1 w-60 sm:w-72 mx-auto">
              {MANUAL_EMOTIONS.map(emotion => {
                const isSelected = selectedEmotions.some(e => e.emotion === emotion.name);
                return (
                  <button
                    key={emotion.name}
                    onClick={() => handleManualEmotionToggle(emotion)}
                    className={`relative p-1.5 sm:p-2 rounded-full aspect-square transition-all duration-300 hover:scale-105 ${
                      isSelected
                        ? 'shadow-xl transform scale-105'
                        : 'hover:shadow-lg'
                    }`}
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${emotion.color}80, ${emotion.color})`
                        : '#E5E7EB',
                      minHeight: '50px',
                      maxHeight: '50px'
                    }}
                    aria-label={`Select ${emotion.label} emotion`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-xs sm:text-sm font-medium ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`}>
                        {emotion.label}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-aurora-secondary-green rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Emotions with Intensity Controls */}
        {selectedEmotions.length > 0 && (
          <div className="card-aurora">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-aurora-primary-dark">Your Mood Profile</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-aurora-primary-dark/70">Blended color:</span>
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: getBlendedColor() }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              {selectedEmotions.map((emotion, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-aurora-primary-light/10 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: emotion.color }}
                    />
                    <span className="font-medium capitalize text-aurora-primary-dark">{emotion.emotion}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustEmotionIntensity(emotion.emotion, -0.1)}
                      className="w-8 h-8 rounded-full bg-aurora-primary-light/20 hover:bg-aurora-primary-light/30 flex items-center justify-center text-aurora-primary-dark transition-colors"
                      disabled={emotion.confidence <= 0.1}
                      aria-label={`Decrease ${emotion.emotion} intensity`}
                    >
                      −
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-aurora-primary-light/20 rounded-full h-2">
                        <div
                          className="bg-aurora-secondary-green h-2 rounded-full transition-all duration-200"
                          style={{ width: `${emotion.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-aurora-primary-dark/70">
                        {Math.round(emotion.confidence * 100)}%
                      </span>
                    </div>
                    
                    <button
                      onClick={() => adjustEmotionIntensity(emotion.emotion, 0.1)}
                      className="w-8 h-8 rounded-full bg-aurora-primary-light/20 hover:bg-aurora-primary-light/30 flex items-center justify-center text-aurora-primary-dark transition-colors"
                      disabled={emotion.confidence >= 1}
                      aria-label={`Increase ${emotion.emotion} intensity`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-column grid for desktop - Energy/Stress and Notes side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {/* Additional Metrics */}
          <div className="card-aurora">
            <h3 className="text-lg font-semibold mb-4 text-aurora-primary-dark">How's Your Energy?</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="energy-level" className="text-sm font-medium text-aurora-primary-dark mb-2 flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Energy Level: {energyLevel}/10
                </label>
                <input
                  id="energy-level"
                  name="energy-level"
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full h-2 bg-aurora-primary-light/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #5ABA1C 0%, #5ABA1C ${energyLevel * 10}%, #e2e8f0 ${energyLevel * 10}%, #e2e8f0 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-aurora-primary-dark/60 mt-1">
                  <span>Exhausted</span>
                  <span>Energized</span>
                </div>
              </div>
              
              <div>
                <label htmlFor="stress-level" className="text-sm font-medium text-aurora-primary-dark mb-2 flex items-center gap-1">
                  <Frown className="w-4 h-4" />
                  Stress Level: {stressLevel}/10
                </label>
                <input
                  id="stress-level"
                  name="stress-level"
                  type="range"
                  min="1"
                  max="10"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                  className="w-full h-2 bg-aurora-primary-light/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #F90038 0%, #F90038 ${stressLevel * 10}%, #e2e8f0 ${stressLevel * 10}%, #e2e8f0 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-aurora-primary-dark/60 mt-1">
                  <span>Relaxed</span>
                  <span>Stressed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card-aurora">
            <label htmlFor="mood-notes" className="block text-lg font-semibold mb-4 text-aurora-primary-dark">Additional Notes</label>
            <textarea
              id="mood-notes"
              name="mood-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's on your mind? Any specific events or thoughts affecting your mood today?"
              className="w-full p-4 border border-aurora-primary-light/30 rounded-lg focus:ring-2 focus:ring-aurora-blue-500 focus:border-transparent outline-none resize-none text-aurora-primary-dark bg-white/80 backdrop-blur-sm"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-aurora-primary-dark/60 mt-2 text-right">
              {notes.length}/500 characters
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedEmotions.length > 0 && (
          <div className="bg-aurora-primary-light/10 backdrop-blur-sm rounded-xl p-6 text-center border border-aurora-primary-light/20">
            <h4 className="text-sm font-medium text-aurora-primary-dark/70 mb-3">Preview: How this will appear on your calendar</h4>
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg shadow-aurora bg-white/90 backdrop-blur-sm">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: getBlendedColor() }}
              />
              <div className="text-left">
                <div className="font-medium text-aurora-primary-dark">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-sm text-aurora-primary-dark/70">
                  {selectedEmotions.map(e => e.emotion).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="text-center pt-2 lg:pt-3">
          <button
            onClick={handleSubmit}
            disabled={selectedEmotions.length === 0 || isSubmitting}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              selectedEmotions.length === 0 || isSubmitting
                ? 'bg-aurora-primary-light/30 text-aurora-primary-dark/50 cursor-not-allowed'
                : 'btn-aurora shadow-aurora hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving Your Mood...
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Complete Mood Check-In
              </span>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default MoodCheckIn;
