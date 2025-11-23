import { useState, useEffect } from 'react';
import { TrendingUp, Smile, Calendar, AlertCircle, Flame, Sun, Moon, Sunrise } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { moodService } from '../services/mood.service';
import { scheduleService } from '../services/schedule.service';
import { getEmotionLabel, getEmotionColor } from '../utils/moodColors';

interface MoodLog {
  log_date: string; // ISO string YYYY-MM-DD
  full_date: Date;  // Full date object for time calculation
  emotions: string[];
}

interface Schedule {
  event_date: string;
  event_type: string;
}

interface MoodStats {
  totalCheckIns: number;
  topEmotions: { emotion: string; count: number; color: string }[];
  weeklyTrend: { week: string; averageIntensity: number }[];
  eventCorrelation: { eventType: string; emotions: string[] }[];
  uniqueEmotions: number;
  currentStreak: number;
  bestStreak: number;
  timeDistribution: {
    morning: number;   // percentage
    afternoon: number; // percentage
    evening: number;   // percentage
  };
}

interface RawMoodLog {
  log_date?: any;
  date?: string;
  emotions?: unknown[];
  id?: string;
}

interface RawSchedule {
  event_date?: string;
  event_type?: string;
  id?: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;

    const endDate = new Date();
    const startDate = new Date();

    if (timeRange === 'week') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setDate(endDate.getDate() - 30);
    } else {
      startDate.setFullYear(endDate.getFullYear() - 1);
    }

    const [moodLogsRaw, schedulesRaw] = await Promise.all([
      moodService.getMoodLogs(
        user.id
      ),
      scheduleService.getSchedules(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
    ]);

    const moodLogs: MoodLog[] = Array.isArray(moodLogsRaw)
      ? moodLogsRaw
        .filter((log) => {
          const moodLog = log as unknown as RawMoodLog;
          return log !== null &&
            typeof log === 'object' &&
            (moodLog.log_date || moodLog.date);
        })
        .map((log: any) => {
          // Handle Firestore Timestamp or Date object or string
          let dateObj = new Date();
          if (log.log_date && typeof log.log_date.toDate === 'function') {
            dateObj = log.log_date.toDate();
          } else if (log.log_date instanceof Date) {
            dateObj = log.log_date;
          } else if (typeof log.log_date === 'string') {
            dateObj = new Date(log.log_date);
          }

          return {
            log_date: dateObj.toISOString().split('T')[0],
            full_date: dateObj,
            emotions: Array.isArray(log.emotions)
              ? log.emotions.filter((e: unknown): e is string => typeof e === 'string')
              : []
          };
        })
      : [];

    const schedulesArr: Schedule[] = Array.isArray(schedulesRaw)
      ? schedulesRaw
        .filter((sch) => {
          return sch !== null &&
            typeof sch === 'object' &&
            typeof (sch as RawSchedule).event_date === 'string' &&
            typeof (sch as RawSchedule).event_type === 'string';
        })
        .map(sch => ({
          event_date: (sch as RawSchedule).event_date!,
          event_type: (sch as RawSchedule).event_type!
        }))
      : [];

    // --- Calculations ---

    // 1. Unique emotions
    const allEmotions = new Set<string>();
    const emotionCounts: Record<string, number> = {};
    moodLogs.forEach(log => {
      log.emotions.forEach(emotion => {
        allEmotions.add(emotion);
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        color: getEmotionColor(emotion),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Weekly grouping
    const weeklyData: Record<string, number[]> = {};
    moodLogs.forEach(log => {
      const date = new Date(log.log_date);
      const day = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - day);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      weeklyData[weekKey].push(log.emotions.length);
    });

    const weeklyTrend = Object.entries(weeklyData).map(([week, intensities]) => ({
      week,
      averageIntensity: intensities.reduce((a, b) => a + b, 0) / intensities.length,
    }));

    // 3. Event Correlation
    const eventTypeEmotions: Record<string, string[]> = {};
    schedulesArr.forEach(schedule => {
      const eventDate = schedule.event_date.split('T')[0];
      const nearbyMoods = moodLogs.filter(log => {
        const logDate = new Date(log.log_date);
        const schedDate = new Date(eventDate);
        const diffDays = Math.abs((schedDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
      });

      if (nearbyMoods.length > 0) {
        if (!eventTypeEmotions[schedule.event_type]) {
          eventTypeEmotions[schedule.event_type] = [];
        }
        nearbyMoods.forEach(mood => {
          eventTypeEmotions[schedule.event_type].push(...mood.emotions);
        });
      }
    });

    const eventCorrelation = Object.entries(eventTypeEmotions).map(([eventType, emotions]) => {
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
      });
      const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([e]) => e);
      return { eventType, emotions: topEmotions };
    });

    // 4. Streak Calculation
    // Sort logs by date descending (newest first)
    const sortedLogs = [...moodLogs].sort((a, b) =>
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );

    // Get unique dates
    const uniqueDates = Array.from(new Set(sortedLogs.map(log => log.log_date)));

    let currentStreak = 0;
    let bestStreak = 0;

    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Check if streak is active (logged today or yesterday)
      const lastLogDate = uniqueDates[0];
      if (lastLogDate === today || lastLogDate === yesterdayStr) {
        currentStreak = 1;
        // Count backwards
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const curr = new Date(uniqueDates[i]);
          const prev = new Date(uniqueDates[i + 1]);
          const diffTime = Math.abs(curr.getTime() - prev.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate best streak
      let tempStreak = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const curr = new Date(uniqueDates[i]);
        const prev = new Date(uniqueDates[i + 1]);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    // 5. Time Distribution
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;
    const totalLogs = moodLogs.length;

    moodLogs.forEach(log => {
      const hour = log.full_date.getHours();
      if (hour >= 4 && hour < 12) {
        morningCount++;
      } else if (hour >= 12 && hour < 18) {
        afternoonCount++;
      } else {
        eveningCount++;
      }
    });

    const timeDistribution = {
      morning: totalLogs > 0 ? Math.round((morningCount / totalLogs) * 100) : 0,
      afternoon: totalLogs > 0 ? Math.round((afternoonCount / totalLogs) * 100) : 0,
      evening: totalLogs > 0 ? Math.round((eveningCount / totalLogs) * 100) : 0,
    };

    setStats({
      totalCheckIns: moodLogs.length,
      topEmotions,
      weeklyTrend,
      eventCorrelation,
      uniqueEmotions: allEmotions.size,
      currentStreak,
      bestStreak,
      timeDistribution
    });
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Analytics</h3>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === range
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {range === 'all' ? 'All Time' : range === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
            <Flame className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h4 className="text-purple-100 font-medium mb-1">Current Streak</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{stats.currentStreak} days</span>
              <span className="text-purple-100 text-sm">Impressive consistency!</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-purple-100 text-sm mb-1">Best streak</div>
          <div className="text-2xl font-bold">{stats.bestStreak} days</div>
        </div>
      </div>

      {/* Time of Day Stats */}
      <div className="bg-gradient-to-r from-purple-300 to-purple-400 rounded-2xl p-6 text-white shadow-lg">
        <h4 className="text-lg font-semibold mb-6">When you usually log mood</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Sunrise className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.morning}%</span>
            <span className="text-sm text-purple-100">Morning</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Sun className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.afternoon}%</span>
            <span className="text-sm text-purple-100">Afternoon</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Moon className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold">{stats.timeDistribution.evening}%</span>
            <span className="text-sm text-purple-100">Evening</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Check-ins</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCheckIns}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Smile className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Unique Emotions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.uniqueEmotions}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Avg. Intensity</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.weeklyTrend.length > 0
              ? (
                stats.weeklyTrend.reduce((a, b) => a + b.averageIntensity, 0) /
                stats.weeklyTrend.length
              ).toFixed(1)
              : '0'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Event Patterns</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.eventCorrelation.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Emotions</h4>
          <div className="space-y-3">
            {stats.topEmotions.map(({ emotion, count, color }) => (
              <div key={emotion} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{getEmotionLabel(emotion)}</span>
                    <span className="text-sm text-gray-600">{count} times</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
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

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Mood & Events</h4>
          {stats.eventCorrelation.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
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
                      : '#e5e7eb',
                  }}
                >
                  <h5 className="font-semibold text-gray-900 capitalize mb-1">
                    {eventType}s
                  </h5>
                  <p className="text-sm text-gray-600">
                    Common moods: {emotions.map(e => getEmotionLabel(e)).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Weekly Intensity Trend</h4>
        <div className="flex items-end gap-2 h-48">
          {stats.weeklyTrend.map(({ week, averageIntensity }, index) => {
            const maxIntensity =
              Math.max(...stats.weeklyTrend.map(w => w.averageIntensity)) || 1;
            const height = (averageIntensity / maxIntensity) * 100;
            return (
              <div key={week} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-teal-500 to-cyan-500 rounded-t-lg transition-all hover:from-teal-600 hover:to-cyan-600"
                  style={{ height: `${height}%` }}
                  title={`Week ${index + 1}: ${averageIntensity.toFixed(1)}`}
                />
                <span className="text-xs text-gray-600">W{index + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
