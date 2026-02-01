import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Heart, Zap, Activity } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
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

const EMOTION_COLORS = {
    joy: { color: '#FFC107', label: 'Joy' },
    love: { color: '#FF55B8', label: 'Love' },
    sadness: { color: '#2196F3', label: 'Sadness' },
    anger: { color: '#F44336', label: 'Anger' },
    fear: { color: '#9C27B0', label: 'Fear' },
    surprise: { color: '#FF9800', label: 'Surprise' },
    disgust: { color: '#4CAF50', label: 'Disgust' },
    neutral: { color: '#9E9E9E', label: 'Neutral' },
};

export default function MoodCalendar() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [moodData, setMoodData] = useState<MoodEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [detailsAnimation] = useState(new Animated.Value(0));

    useEffect(() => {
        if (user) {
            loadMoodData();
        }
    }, [currentDate, user]);

    useEffect(() => {
        if (selectedDay) {
            Animated.spring(detailsAnimation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            detailsAnimation.setValue(0);
        }
    }, [selectedDay]);

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
        setSelectedDay(null);
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

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalWeight = 0;

        moods.forEach(mood => {
            mood.emotions.forEach(emotion => {
                const hex = emotion.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);

                const weight = emotion.confidence || 1;

                totalR += r * weight;
                totalG += g * weight;
                totalB += b * weight;
                totalWeight += weight;
            });
        });

        if (totalWeight === 0) return undefined;

        const avgR = Math.round(totalR / totalWeight);
        const avgG = Math.round(totalG / totalWeight);
        const avgB = Math.round(totalB / totalWeight);

        return `rgb(${avgR}, ${avgG}, ${avgB})`;
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getMostCommonEmotion = () => {
        const emotionCounts: Record<string, number> = {};
        moodData.forEach(mood => {
            mood.emotions.forEach(emotion => {
                emotionCounts[emotion.emotion] = (emotionCounts[emotion.emotion] || 0) + 1;
            });
        });
        const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || 'none';
    };

    const getPositiveDaysCount = () => {
        return moodData.filter(mood =>
            mood?.emotions?.some(e => e && ['joy', 'love', 'surprise'].includes(e.emotion))
        ).length;
    };

    const calendarDays = generateCalendarDays();
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    if (loading) {
        return (
            <View className="flex-1">
                <View className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                    <View className="flex-row items-center justify-center py-12">
                        <View className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                        <Text className="ml-4 text-gray-600 font-medium">Loading calendar...</Text>
                    </View>
                </View>
            </View>
        );
    }

    console.log('Rendering MoodCalendar');

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Emotion Legend */}
            <View className="bg-indigo-50 rounded-3xl p-5 mb-4 border border-indigo-100 shadow-sm">
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Emotion Colors</Text>
                <View className="flex-row flex-wrap gap-2">
                    {Object.entries(EMOTION_COLORS).map(([key, { color, label }]) => (
                        <View key={key} className="flex-row items-center bg-white rounded-full px-3 py-1.5 shadow-sm">
                            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                            <Text className="text-xs font-semibold text-gray-700">{label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Monthly Stats Card */}
            <View className="bg-indigo-500 rounded-3xl p-5 mb-4 shadow-lg">
                <View className="flex-row items-center mb-4">
                    <TrendingUp size={20} color="#fff" />
                    <Text className="text-white font-bold text-base ml-2">This Month's Insights</Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                    <View className="bg-white/20 rounded-2xl p-3 flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <CalendarIcon size={14} color="#fff" />
                            <Text className="text-white/80 text-xs font-medium ml-1">Entries</Text>
                        </View>
                        <Text className="text-white text-2xl font-bold">{moodData.length}</Text>
                    </View>
                    <View className="bg-white/20 rounded-2xl p-3 flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <Heart size={14} color="#fff" />
                            <Text className="text-white/80 text-xs font-medium ml-1">Positive Days</Text>
                        </View>
                        <Text className="text-white text-2xl font-bold">{getPositiveDaysCount()}</Text>
                    </View>
                    <View className="bg-white/20 rounded-2xl p-3 flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <Zap size={14} color="#fff" />
                            <Text className="text-white/80 text-xs font-medium ml-1">Avg Energy</Text>
                        </View>
                        <Text className="text-white text-2xl font-bold">
                            {moodData.length > 0 ? Math.round(moodData.reduce((sum, mood) => sum + (mood?.energy_level || 0), 0) / moodData.length) : 0}
                            <Text className="text-base">/10</Text>
                        </Text>
                    </View>
                    <View className="bg-white/20 rounded-2xl p-3 flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <Activity size={14} color="#fff" />
                            <Text className="text-white/80 text-xs font-medium ml-1">Top Emotion</Text>
                        </View>
                        <Text className="text-white text-xl font-bold capitalize">{getMostCommonEmotion()}</Text>
                    </View>
                </View>
            </View>

            {/* Calendar Card */}
            <View className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 mb-4">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity
                        onPress={() => navigateMonth('prev')}
                        className="p-2.5 rounded-xl bg-gray-50 active:bg-gray-100"
                    >
                        <ChevronLeft size={22} color="#374151" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View className="flex-row items-center">
                        <CalendarIcon size={18} color="#6366f1" />
                        <Text className="text-lg font-bold text-gray-900 ml-2">
                            {formatMonthYear(currentDate)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigateMonth('next')}
                        className="p-2.5 rounded-xl bg-gray-50 active:bg-gray-100"
                    >
                        <ChevronRight size={22} color="#374151" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                {/* Week Headers */}
                <View className="flex-row justify-between mb-3 px-1">
                    {weekDays.map((day, i) => (
                        <View key={i} className="w-[14.28%]">
                            <Text className="text-center text-xs font-bold text-gray-400 uppercase">
                                {day}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Days Grid */}
                <View className="flex-row flex-wrap">
                    {calendarDays.map((day, index) => {
                        const isSelected = selectedDay?.date.toDateString() === day.date.toDateString();
                        const hasMood = day.moods.length > 0;

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    console.log('Day pressed:', day.date);
                                    setSelectedDay(day);
                                }}
                                className="w-[14.28%] aspect-square p-0.5"
                                activeOpacity={0.7}
                            >
                                <View className="flex-1 items-center justify-center">
                                    {/* Day Circle */}
                                    <View
                                        className={`
                                            w-11 h-11 items-center justify-center rounded-full
                                            ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                            ${isSelected ? 'shadow-md' : ''}
                                        `}
                                        style={[
                                            hasMood ? {
                                                backgroundColor: day.blendedColor,
                                                shadowColor: day.blendedColor,
                                                shadowOpacity: 0.5,
                                                shadowRadius: 8,
                                                shadowOffset: { width: 0, height: 2 }
                                            } : {},
                                            !hasMood && day.isToday ? { backgroundColor: '#EEF2FF' } : {},
                                            isSelected ? {
                                                borderWidth: 3,
                                                borderColor: '#6366f1',
                                                transform: [{ scale: 1.1 }]
                                            } : {}
                                        ]}
                                    >
                                        <Text
                                            className={`
                                                text-sm font-semibold
                                                ${hasMood ? 'text-white' : day.isToday ? 'text-indigo-600' : 'text-gray-700'}
                                            `}
                                        >
                                            {day.date.getDate()}
                                        </Text>

                                        {/* Mood Count Badge */}
                                        {hasMood && day.moods.length > 1 && (
                                            <View className="absolute -top-1 -right-1 bg-white rounded-full w-4 h-4 items-center justify-center shadow-sm">
                                                <Text className="text-[9px] font-bold text-indigo-600">
                                                    {day.moods.length}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Today Indicator */}
                                        {day.isToday && (
                                            <View className="absolute -bottom-1 w-1 h-1 bg-indigo-500 rounded-full" />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Selected Day Details Section */}
            {selectedDay && (
                <Animated.View
                    style={{
                        opacity: detailsAnimation,
                        transform: [{
                            translateY: detailsAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                            })
                        }]
                    }}
                >
                    {selectedDay.moods.length > 0 ? (
                        <View className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 mb-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="font-bold text-lg text-gray-900">
                                    {selectedDay.date.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </Text>
                                <View className="bg-indigo-50 rounded-full px-3 py-1">
                                    <Text className="text-indigo-600 font-bold text-xs">
                                        {selectedDay.moods.length} {selectedDay.moods.length === 1 ? 'entry' : 'entries'}
                                    </Text>
                                </View>
                            </View>

                            <View className="space-y-3">
                                {selectedDay.moods.map((mood, idx) => (
                                    <View
                                        key={idx}
                                        className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
                                    >
                                        {/* Emotions with Pills */}
                                        <View className="flex-row flex-wrap gap-2 mb-3">
                                            {mood.emotions.map((e, i) => (
                                                <View
                                                    key={i}
                                                    className="flex-row items-center bg-white rounded-full pl-1 pr-3 py-1 shadow-sm border border-gray-100"
                                                >
                                                    <View
                                                        className="w-4 h-4 rounded-full mr-1.5"
                                                        style={{ backgroundColor: e.color }}
                                                    />
                                                    <Text className="text-xs font-bold text-gray-700 capitalize">
                                                        {e.emotion}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Metrics Row */}
                                        <View className="flex-row gap-4 mb-2">
                                            <View className="flex-row items-center">
                                                <Zap size={14} color="#6366f1" />
                                                <Text className="text-xs text-gray-600 font-medium ml-1">
                                                    Energy: <Text className="font-bold text-indigo-600">{mood.energy_level}/10</Text>
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <Activity size={14} color="#f59e0b" />
                                                <Text className="text-xs text-gray-600 font-medium ml-1">
                                                    Stress: <Text className="font-bold text-amber-600">{mood.stress_level}/10</Text>
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Time */}
                                        <Text className="text-xs text-gray-400 font-medium">
                                            {mood.log_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>

                                        {/* Note */}
                                        {mood.notes && (
                                            <View className="mt-3 pt-3 border-t border-gray-100">
                                                <Text className="text-sm text-gray-600 italic leading-5">
                                                    "{mood.notes}"
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 items-center mb-4">
                            <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
                                <CalendarIcon size={28} color="#D1D5DB" />
                            </View>
                            <Text className="font-bold text-lg text-gray-900 mb-1">
                                {selectedDay.date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                            <Text className="text-gray-400 text-center text-sm">
                                No mood entries logged on this day.{'\n'}Take a moment to check in with yourself.
                            </Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </ScrollView>
    );
}
