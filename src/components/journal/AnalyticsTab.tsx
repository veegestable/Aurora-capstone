import { WeeklyNarrative } from '../analytics/WeeklyNarrative'
import { TrendingUp, Smile, Calendar, AlertCircle, Flame, Sun, Moon, Sunrise } from 'lucide-react'
import { getEmotionLabel, getEmotionColor } from '../../utils/moodColors'
import { useAnalytics } from '../../hooks/useAnalytics'

export function AnalyticsTab() {
  const { stats, timeRange, setTimeRange } = useAnalytics()

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-aurora-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-white font-heading">Analytics Overview</h3>
        <div className="flex bg-aurora-bg/50 p-1 rounded-xl border border-white/5">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                timeRange === range
                  ? 'bg-aurora-blue text-white shadow-md'
                  : 'text-aurora-text-sec hover:text-white cursor-pointer hover:bg-white/5'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-linear-to-r from-[#7C3AED] to-aurora-purple-deep rounded-2xl p-5 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shadow-inner border border-white/20">
            <Flame className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h4 className="text-white/80 font-medium mb-0.5 text-sm uppercase tracking-wider">Current Streak</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">{stats.currentStreak}</span>
              <span className="text-white/80 font-medium">days</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/80 text-sm mb-1 font-medium uppercase tracking-wider">Best streak</div>
          <div className="text-2xl font-bold">{stats.bestStreak} days</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-aurora p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-aurora-blue/15 rounded-xl border border-aurora-blue/30">
              <Calendar className="w-5 h-5 text-aurora-blue" />
            </div>
            <span className="text-xs font-bold text-aurora-text-sec uppercase tracking-widest">Check-ins</span>
          </div>
          <p className="text-3xl font-extrabold text-white font-heading">{stats.totalCheckIns}</p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-500/15 rounded-xl border border-green-500/30">
              <Smile className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs font-bold text-aurora-text-sec uppercase tracking-widest">Emotions</span>
          </div>
          <p className="text-3xl font-extrabold text-white font-heading">{stats.uniqueEmotions}</p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-orange-500/15 rounded-xl border border-orange-500/30">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-xs font-bold text-aurora-text-sec uppercase tracking-widest">Avg. Intensity</span>
          </div>
          <p className="text-3xl font-extrabold text-white font-heading">
            {stats.weeklyTrend.length > 0
              ? (
                stats.weeklyTrend.reduce((a, b) => a + b.averageIntensity, 0) /
                stats.weeklyTrend.length
              ).toFixed(1)
              : '0'}
          </p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-aurora-purple/15 rounded-xl border border-aurora-purple/30">
              <AlertCircle className="w-5 h-5 text-aurora-purple" />
            </div>
            <span className="text-xs font-bold text-aurora-text-sec uppercase tracking-widest">Event Patterns</span>
          </div>
          <p className="text-3xl font-extrabold text-white font-heading">{stats.eventCorrelation.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Time of Day Stats */}
        <div className="card-aurora p-6">
          <h4 className="text-base font-bold text-white mb-6 uppercase tracking-wider">Time of Day</h4>
          <div className="grid grid-cols-3 gap-2 text-center h-full items-center">
            <div className="flex flex-col items-center gap-3 group">
              <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-aurora-blue/10 transition-colors">
                <Sunrise className="w-6 h-6 text-aurora-text-sec group-hover:text-aurora-blue" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">{stats.timeDistribution.morning}%</span>
                <span className="text-xs font-semibold text-aurora-text-muted uppercase">Morning</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 group">
              <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-orange-400/10 transition-colors">
                <Sun className="w-6 h-6 text-aurora-text-sec group-hover:text-orange-400" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">{stats.timeDistribution.afternoon}%</span>
                <span className="text-xs font-semibold text-aurora-text-muted uppercase">Afternoon</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 group">
              <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-aurora-purple/10 transition-colors">
                <Moon className="w-6 h-6 text-aurora-text-sec group-hover:text-aurora-purple" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">{stats.timeDistribution.evening}%</span>
                <span className="text-xs font-semibold text-aurora-text-muted uppercase">Evening</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-aurora p-6">
          <h4 className="text-base font-bold text-white mb-5 uppercase tracking-wider">Top Emotions</h4>
          <div className="space-y-4">
            {stats.topEmotions.map(({ emotion, count, color }) => (
              <div key={emotion} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10" style={{ backgroundColor: `${color}30` }}>
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white capitalize">{getEmotionLabel(emotion)}</span>
                    <span className="text-xs font-bold text-aurora-text-sec bg-white/5 px-2 py-0.5 rounded-md">{count} logs</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${stats.topEmotions[0].count ? (count / stats.topEmotions[0].count) * 100 : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.topEmotions.length === 0 && (
               <p className="text-aurora-text-muted text-center py-4">No emotions logged yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
         <div className="card-aurora p-6">
          <h4 className="text-base font-bold text-white mb-5 uppercase tracking-wider">Weekly Intensity Trend</h4>
          <div className="flex items-end gap-3 h-48 mt-4">
            {stats.weeklyTrend.map(({ week, averageIntensity }, index) => {
              const maxIntensity = Math.max(...stats.weeklyTrend.map(w => w.averageIntensity)) || 1
              const height = (averageIntensity / maxIntensity) * 100
              return (
                <div key={week} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative h-full flex items-end">
                    <div
                      className="w-full bg-linear-to-t from-aurora-blue to-aurora-purple rounded-t-xl transition-all duration-500 opacity-80 group-hover:opacity-100"
                      style={{ height: `${height}%` }}
                      title={`Week ${index + 1}: ${averageIntensity.toFixed(1)}`}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap">
                         {averageIntensity.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-aurora-text-sec uppercase tracking-widest">W{index + 1}</span>
                </div>
              )
            })}
             {stats.weeklyTrend.length === 0 && (
               <div className="w-full h-full flex items-center justify-center text-aurora-text-muted">No trend data available</div>
             )}
          </div>
        </div>

        <div className="card-aurora p-6">
          <h4 className="text-base font-bold text-white mb-5 uppercase tracking-wider">Mood & Events</h4>
          {stats.eventCorrelation.length === 0 ? (
            <p className="text-aurora-text-muted text-center py-10 border border-dashed border-white/10 rounded-xl">
              No event correlations found yet. <br/> Add events to see patterns.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.eventCorrelation.map(({ eventType, emotions }) => (
                <div
                  key={eventType}
                  className="p-4 bg-white/5 rounded-xl border border-l-4"
                  style={{
                    borderLeftColor: emotions.length ? getEmotionColor(emotions[0]) : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <h5 className="font-bold text-white capitalize mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-aurora-text-sec" />
                    {eventType}s
                  </h5>
                  <p className="text-sm font-medium text-aurora-text-sec mt-2">
                    Common moods: <span className="text-white capitalize">{emotions.map(e => getEmotionLabel(e)).join(', ')}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly AI Narrative */}
      <WeeklyNarrative />
    </div>
  )
}