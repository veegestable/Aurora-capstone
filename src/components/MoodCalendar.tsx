import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { getColorWithAlpha } from '../utils/moodColors'
import { useMoodCalendar } from '../hooks/useMoodCalendar'

export default function MoodCalendar() {
  const {
    loading,
    selectedDay,
    setSelectedDay,
    navigateMonth,
    formatMonthYear,
    calendarDays,
    currentDate,
    moodData,
  } = useMoodCalendar()

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="bg-[#10143C] rounded-xl border border-white/8 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D6BFF]"></div>
          <p className="ml-4 text-[#7B8EC8]">Loading mood calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#10143C] rounded-xl border border-white/8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-[#2D6BFF]" />
          <h3 className="text-xl font-bold text-white">Mood Calendar</h3>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5 text-[#7B8EC8]" />
          </button>

          <h4 className="text-lg font-semibold text-white min-w-[180px] text-center">
            {formatMonthYear(currentDate)}
          </h4>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5 text-[#7B8EC8]" />
          </button>
        </div>
      </div>

      {/* Emotion Legend */}
      <div className="mb-8 p-6 bg-white/3 rounded-2xl border border-white/8">
        <h4 className="text-sm font-bold text-[#4B5693] uppercase tracking-widest mb-4 ml-1">Emotion Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Joy', color: 'bg-yellow-400', ring: 'ring-yellow-400/20', ringHover: 'group-hover:ring-yellow-400/40' },
            { label: 'Love', color: 'bg-pink-400', ring: 'ring-pink-400/20', ringHover: 'group-hover:ring-pink-400/40' },
            { label: 'Sadness', color: 'bg-blue-500', ring: 'ring-blue-500/20', ringHover: 'group-hover:ring-blue-500/40' },
            { label: 'Anger', color: 'bg-red-500', ring: 'ring-red-500/20', ringHover: 'group-hover:ring-red-500/40' },
            { label: 'Fear', color: 'bg-purple-500', ring: 'ring-purple-500/20', ringHover: 'group-hover:ring-purple-500/40' },
            { label: 'Surprise', color: 'bg-orange-400', ring: 'ring-orange-400/20', ringHover: 'group-hover:ring-orange-400/40' },
            { label: 'Disgust', color: 'bg-green-500', ring: 'ring-green-500/20', ringHover: 'group-hover:ring-green-500/40' },
            { label: 'Neutral', color: 'bg-gray-400', ring: 'ring-gray-400/20', ringHover: 'group-hover:ring-gray-400/40' },
          ].map((emotion) => (
            <div
              key={emotion.label}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:border-white/12 hover:-translate-y-0.5 transition-all duration-300 cursor-default"
            >
              <div className={`w-4 h-4 rounded-full ${emotion.color} ring-4 ${emotion.ring} ${emotion.ringHover} transition-all`} />
              <span className="text-sm font-bold text-[#7B8EC8] group-hover:text-white transition-colors">{emotion.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-[#7B8EC8] bg-white/5 rounded-lg">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => setSelectedDay(day)}
            className={`
              relative p-2 md:p-3 aspect-square cursor-pointer transition-all duration-200 rounded-lg border-2
              ${day.isCurrentMonth ? 'hover:border-white/20' : 'opacity-40'}
              ${day.isToday ? 'border-[#2D6BFF] bg-[rgba(45,107,255,0.1)] ring-2 ring-[#2D6BFF]/30' : 'border-white/8'}
              ${selectedDay?.date.toDateString() === day.date.toDateString() ? 'border-[#7C3AED] bg-[rgba(124,58,237,0.1)] ring-2 ring-[#7C3AED]/30' : ''}
              ${day.moods.length > 0 ? '' : 'hover:bg-white/5'}
            `}
            style={{
              backgroundColor: day.blendedColor ? getColorWithAlpha(day.blendedColor, 0.15) : undefined,
              borderColor: day.blendedColor || undefined
            }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className={`
                text-sm font-medium
                ${day.isCurrentMonth ? 'text-white' : 'text-[#4B5693]'}
                ${day.isToday ? 'text-[#2D6BFF] font-bold' : ''}
              `}>
                {day.date.getDate()}
              </span>

              {day.moods.length > 0 && (
                <div className="flex flex-col items-center mt-1 space-y-1">
                  <div className="flex gap-1">
                    {day.moods.slice(0, 3).map((mood, moodIndex) => {
                      const firstEmotion = mood?.emotions?.[0];
                      const color = firstEmotion?.color || '#gray-400';
                      const emotionNames = mood?.emotions?.map(e => e?.emotion).filter(Boolean).join(', ') || 'Unknown';

                      return (
                        <div
                          key={moodIndex}
                          className="w-2 h-2 rounded-full shadow-xs"
                          style={{ backgroundColor: color }}
                          title={emotionNames}
                        />
                      );
                    })}
                  </div>
                  {day.moods.length > 3 && (
                    <div className="text-xs text-[#4B5693] font-medium">
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
        <div className="mt-6 p-6 bg-[#0D1238] rounded-xl border border-white/8">
          <h5 className="font-bold text-white mb-4 text-lg">
            📅 {selectedDay.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h5>

          <div className="space-y-4">
            {selectedDay.moods.map((mood, index) => {
              if (!mood || !mood.emotions) return null;

              return (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex gap-1">
                      {mood.emotions.slice(0, 4).map((emotion, emotionIndex) => {
                        if (!emotion || !emotion.color) return null;

                        return (
                          <div
                            key={emotionIndex}
                            className="w-4 h-4 rounded-full border-2 border-[#0D1238] shadow-xs"
                            style={{ backgroundColor: emotion.color }}
                            title={`${emotion.emotion || 'Unknown'}: ${Math.round((emotion.confidence || 0) * 100)}%`}
                          />
                        );
                      })}
                    </div>
                    <div>
                      <div className="font-medium text-white capitalize">
                        {mood.emotions.map(e => e?.emotion || 'Unknown').join(', ')}
                      </div>
                      <div className="text-sm text-[#7B8EC8]">
                        ⚡ Energy: {mood.energy_level || 0}/10 • 😰 Stress: {mood.stress_level || 0}/10
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#4B5693]">
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
            <div className="mt-4 p-4 bg-white/5 rounded-lg border-l-4 border-[#2D6BFF]/30">
              <p className="text-sm text-[#7B8EC8] italic">
                💭 "{selectedDay.moods[0].notes}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State for Selected Day */}
      {selectedDay && selectedDay.moods.length === 0 && (
        <div className="mt-6 p-6 bg-[#0D1238] rounded-xl border border-white/8 text-center">
          <CalendarIcon className="w-12 h-12 text-[#4B5693] mx-auto mb-3" />
          <h5 className="font-medium text-white mb-1">No mood logged</h5>
          <p className="text-sm text-[#7B8EC8]">
            You didn't log any mood entries on {selectedDay.date.toLocaleDateString()}.
          </p>
        </div>
      )}

      {/* Monthly Stats */}
      <div className="mt-6 pt-6 border-t border-white/8">
        <h4 className="font-semibold text-[#7B8EC8] mb-4">📊 This Month's Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[rgba(45,107,255,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-[#2D6BFF]">
              {moodData.length}
            </div>
            <div className="text-sm text-[#7B8EC8]">
              Mood Entries
            </div>
          </div>
          <div className="text-center p-4 bg-[rgba(34,197,94,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-[#22C55E]">
              {moodData.filter(mood =>
                mood?.emotions?.some(e => e && ['joy', 'love', 'surprise'].includes(e.emotion))
              ).length}
            </div>
            <div className="text-sm text-[#7B8EC8]">
              Positive Days
            </div>
          </div>
          <div className="text-center p-4 bg-[rgba(45,107,255,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-[#2D6BFF]">
              {moodData.length > 0 ? Math.round(
                moodData.reduce((sum, mood) => sum + (mood?.energy_level || 0), 0) / moodData.length
              ) : 0}
            </div>
            <div className="text-sm text-[#7B8EC8]">
              Avg Energy
            </div>
          </div>
          <div className="text-center p-4 bg-[rgba(124,58,237,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-[#7C3AED]">
              {moodData.length > 0 ? Math.round(
                moodData.reduce((sum, mood) => sum + (mood?.stress_level || 0), 0) / moodData.length
              ) : 0}
            </div>
            <div className="text-sm text-[#7B8EC8]">
              Avg Stress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
