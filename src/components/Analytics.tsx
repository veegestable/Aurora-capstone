import { WeeklyNarrative } from './analytics/WeeklyNarrative'
import { TrendingUp, Smile, Calendar, AlertCircle, Flame, Sun, Moon, Sunrise } from 'lucide-react'
import { getEmotionLabel, getEmotionColor } from '../utils/moodColors'
import { useAnalytics } from '../hooks/useAnalytics'

export default function Analytics() {
  const { stats, timeRange, setTimeRange } = useAnalytics()

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#2D6BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">Analytics</h3>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === range
                ? 'bg-[#2D6BFF] text-white'
                : 'bg-white/5 text-[#7B8EC8] hover:bg-white/10'
                }`}
            >
              {range === 'all' ? 'All Time' : range === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-linear-to-r from-[#7C3AED] to-aurora-purple-deep rounded-2xl p-4 md:p-6 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-xs">
            <Flame className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h4 className="text-white/70 font-medium mb-1">Current Streak</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{stats.currentStreak} days</span>
              <span className="text-white/70 text-sm">Impressive consistency!</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/70 text-sm mb-1">Best streak</div>
          <div className="text-2xl font-bold">{stats.bestStreak} days</div>
        </div>
      </div>

      {/* Time of Day Stats */}
      <div className="bg-linear-to-r from-[#7C3AED]/80 to-aurora-purple-deep/80 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        <h4 className="text-lg font-semibold mb-6">When you usually log mood</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Sunrise className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.morning}%</span>
            <span className="text-sm text-white/70">Morning</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Sun className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.afternoon}%</span>
            <span className="text-sm text-white/70">Afternoon</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Moon className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.evening}%</span>
            <span className="text-sm text-white/70">Evening</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[rgba(45,107,255,0.15)] rounded-lg">
              <Calendar className="w-5 h-5 text-[#2D6BFF]" />
            </div>
            <span className="text-sm font-medium text-[#7B8EC8]">Total Check-ins</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalCheckIns}</p>
        </div>

        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[rgba(34,197,94,0.15)] rounded-lg">
              <Smile className="w-5 h-5 text-[#22C55E]" />
            </div>
            <span className="text-sm font-medium text-[#7B8EC8]">Unique Emotions</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.uniqueEmotions}</p>
        </div>

        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[rgba(249,115,22,0.15)] rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#F97316]" />
            </div>
            <span className="text-sm font-medium text-[#7B8EC8]">Avg. Intensity</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.weeklyTrend.length > 0
              ? (
                stats.weeklyTrend.reduce((a, b) => a + b.averageIntensity, 0) /
                stats.weeklyTrend.length
              ).toFixed(1)
              : '0'}
          </p>
        </div>

        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[rgba(124,58,237,0.15)] rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-sm font-medium text-[#7B8EC8]">Event Patterns</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.eventCorrelation.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <h4 className="text-lg font-semibold text-white mb-4">Top Emotions</h4>
          <div className="space-y-3">
            {stats.topEmotions.map(({ emotion, count, color }) => (
              <div key={emotion} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{getEmotionLabel(emotion)}</span>
                    <span className="text-sm text-[#7B8EC8]">{count} times</span>
                  </div>
                  <div className="w-full bg-white/8 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${stats.topEmotions[0].count
                          ? (count / stats.topEmotions[0].count) * 100
                          : 0
                          }%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
          <h4 className="text-lg font-semibold text-white mb-4">Mood & Events</h4>
          {stats.eventCorrelation.length === 0 ? (
            <p className="text-[#7B8EC8] text-center py-8">
              No event correlations found yet. Add events to see patterns.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.eventCorrelation.map(({ eventType, emotions }) => (
                <div
                  key={eventType}
                  className="border-l-4 pl-4"
                  style={{
                    borderColor: emotions.length
                      ? getEmotionColor(emotions[0])
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <h5 className="font-semibold text-white capitalize mb-1">
                    {eventType}s
                  </h5>
                  <p className="text-sm text-[#7B8EC8]">
                    Common moods: {emotions.map(e => getEmotionLabel(e)).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
        <h4 className="text-lg font-semibold text-white mb-4">Weekly Intensity Trend</h4>
        <div className="flex items-end gap-2 h-48">
          {stats.weeklyTrend.map(({ week, averageIntensity }, index) => {
            const maxIntensity =
              Math.max(...stats.weeklyTrend.map(w => w.averageIntensity)) || 1
            const height = (averageIntensity / maxIntensity) * 100
            return (
              <div key={week} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-linear-to-t from-[#2D6BFF] to-[#7C3AED] rounded-t-lg transition-all hover:from-[#4D8BFF] hover:to-aurora-purple-bright"
                  style={{ height: `${height}%` }}
                  title={`Week ${index + 1}: ${averageIntensity.toFixed(1)}`}
                />
                <span className="text-xs text-[#7B8EC8]">W{index + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekly AI Narrative */}
      <WeeklyNarrative />
    </div>
  )
}
