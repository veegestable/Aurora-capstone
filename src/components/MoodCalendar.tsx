import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { moodService } from '../services/mood.service';
import { MoodData } from '../services/firebase-firestore.service';

interface MoodEntry extends MoodData {
  id: string;
  created_at: Date;
  log_date: Date;
}

interface CalendarDay {
  date: Date;
  moods: MoodEntry[];
  isCurrentMonth: boolean;
  isToday: boolean;
  blendedColor?: string;
}

export default function MoodCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    if (user) {
      loadMoodData();
    }
  }, [currentDate, user]);

  const loadMoodData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const data = await moodService.getMoodLogs(
        user.id,
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );
      
      console.log('Mood data loaded:', data); // Debug log
      
      // Firebase returns the correct structure with proper types
      if (Array.isArray(data)) {
        setMoodData(data);
      } else {
        setMoodData([]);
      }
    } catch (error) {
      console.error('Error loading mood data:', error);
      setMoodData([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfCalendar = new Date(firstDayOfMonth);
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfCalendar.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(firstDayOfCalendar);
      date.setDate(firstDayOfCalendar.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayMoods = moodData.filter(mood => {
        if (!mood || !mood.log_date) return false;
        const moodDateString = mood.log_date.toISOString().split('T')[0];
        return moodDateString === dateString;
      });
      
      const blendedColor = getBlendedColor(dayMoods);
      
      days.push({
        date,
        moods: dayMoods,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        blendedColor
      });
    }
    
    return days;
  };

  const getBlendedColor = (moods: MoodEntry[]): string | undefined => {
    if (!moods || moods.length === 0) return undefined;
    
    // Collect all emotions with their colors and confidence
    const colorData: Array<{ color: string; confidence: number }> = [];
    
    moods.forEach(mood => {
      // Add null checks for mood and emotions
      if (!mood || !mood.emotions || !Array.isArray(mood.emotions)) {
        console.warn('Invalid mood data:', mood);
        return;
      }
      
      mood.emotions.forEach(emotion => {
        if (emotion && emotion.color && typeof emotion.confidence === 'number') {
          colorData.push({ color: emotion.color, confidence: emotion.confidence });
        }
      });
    });
    
    if (colorData.length === 0) return undefined;
    if (colorData.length === 1) return colorData[0].color;
    
    // Calculate weighted average color
    let totalWeight = 0;
    let r = 0, g = 0, b = 0;
    
    colorData.forEach(({ color, confidence }) => {
      const rgb = hexToRgb(color);
      if (rgb) {
        r += rgb.r * confidence;
        g += rgb.g * confidence;
        b += rgb.b * confidence;
        totalWeight += confidence;
      }
    });
    
    if (totalWeight === 0) return colorData[0].color;
    
    r = Math.round(r / totalWeight);
    g = Math.round(g / totalWeight);
    b = Math.round(b / totalWeight);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    if (!hex || typeof hex !== 'string') return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };



  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="ml-4 text-gray-600">Loading mood calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-teal-600" />
          <h3 className="text-xl font-bold text-gray-900">Mood Calendar</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h4 className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
            {formatMonthYear(currentDate)}
          </h4>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Emotion Legend */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Emotion Colors</h4>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className='text-gray-900'>Joy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-400"></div>
            <span className='text-gray-900'>Love</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className='text-gray-900'>Sadness</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className='text-gray-900'>Anger</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className='text-gray-900'>Fear</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className='text-gray-900'>Surprise</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className='text-gray-900'>Disgust</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className='text-gray-900'>Neutral</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => setSelectedDay(day)}
            className={`
              relative p-3 h-20 cursor-pointer transition-all duration-200 rounded-lg border-2
              ${day.isCurrentMonth ? 'hover:shadow-lg hover:scale-105' : 'opacity-40'}
              ${day.isToday ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-gray-100'}
              ${selectedDay?.date.toDateString() === day.date.toDateString() ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ''}
              ${day.moods.length > 0 ? 'shadow-md' : 'bg-white hover:bg-gray-50'}
            `}
            style={{
              backgroundColor: day.blendedColor ? `${day.blendedColor}15` : undefined,
              borderColor: day.blendedColor || undefined
            }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className={`
                text-sm font-medium
                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${day.isToday ? 'text-teal-700 font-bold' : ''}
              `}>
                {day.date.getDate()}
              </span>
              
              {day.moods.length > 0 && (
                <div className="flex flex-col items-center mt-1 space-y-1">
                  <div className="flex gap-1">
                    {day.moods.slice(0, 3).map((mood, moodIndex) => {
                      // Add safety checks for mood data
                      const firstEmotion = mood?.emotions?.[0];
                      const color = firstEmotion?.color || '#gray-400';
                      const emotionNames = mood?.emotions?.map(e => e?.emotion).filter(Boolean).join(', ') || 'Unknown';
                      
                      return (
                        <div
                          key={moodIndex}
                          className="w-2 h-2 rounded-full shadow-sm"
                          style={{ backgroundColor: color }}
                          title={emotionNames}
                        />
                      );
                    })}
                  </div>
                  {day.moods.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{day.moods.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Day Details */}
      {selectedDay && selectedDay.moods.length > 0 && (
        <div className="mt-6 p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100">
          <h5 className="font-bold text-gray-900 mb-4 text-lg">
            📅 {selectedDay.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h5>
          
          <div className="space-y-4">
            {selectedDay.moods.map((mood, index) => {
              // Add safety checks for mood details
              if (!mood || !mood.emotions) return null;
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex gap-1">
                      {mood.emotions.slice(0, 4).map((emotion, emotionIndex) => {
                        if (!emotion || !emotion.color) return null;
                        
                        return (
                          <div
                            key={emotionIndex}
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: emotion.color }}
                            title={`${emotion.emotion || 'Unknown'}: ${Math.round((emotion.confidence || 0) * 100)}%`}
                          />
                        );
                      })}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {mood.emotions.map(e => e?.emotion || 'Unknown').join(', ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        ⚡ Energy: {mood.energy_level || 0}/10 • 😰 Stress: {mood.stress_level || 0}/10
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {mood.log_date ? mood.log_date.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown time'}
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedDay.moods[0]?.notes && (
            <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-blue-300">
              <p className="text-sm text-gray-700 italic">
                💭 "{selectedDay.moods[0].notes}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State for Selected Day */}
      {selectedDay && selectedDay.moods.length === 0 && (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h5 className="font-medium text-gray-900 mb-1">No mood logged</h5>
          <p className="text-sm text-gray-600">
            You didn't log any mood entries on {selectedDay.date.toLocaleDateString()}.
          </p>
        </div>
      )}

      {/* Monthly Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-4">📊 This Month's Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-teal-50 rounded-lg">
            <div className="text-2xl font-bold text-teal-600">
              {moodData.length}
            </div>
            <div className="text-sm text-teal-800">
              Mood Entries
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {moodData.filter(mood => 
                mood?.emotions?.some(e => e && ['joy', 'love', 'surprise'].includes(e.emotion))
              ).length}
            </div>
            <div className="text-sm text-green-800">
              Positive Days
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {moodData.length > 0 ? Math.round(
                moodData.reduce((sum, mood) => sum + (mood?.energy_level || 0), 0) / moodData.length
              ) : 0}
            </div>
            <div className="text-sm text-blue-800">
              Avg Energy
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {moodData.length > 0 ? Math.round(
                moodData.reduce((sum, mood) => sum + (mood?.stress_level || 0), 0) / moodData.length
              ) : 0}
            </div>
            <div className="text-sm text-purple-800">
              Avg Stress
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h5 className="font-medium text-yellow-800 mb-2">Debug Info:</h5>
          <p className="text-sm text-yellow-700">
            Loaded {moodData.length} mood entries for {formatMonthYear(currentDate)}
          </p>
          {moodData.length > 0 && (
            <pre className="text-xs text-yellow-600 mt-2 overflow-x-auto">
              {JSON.stringify(moodData[0], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
