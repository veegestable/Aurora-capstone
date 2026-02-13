import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
import { moodService } from '../services/mood.service';
import { MoodData } from '../services/firebase-firestore.service';
import { Card } from './common/Card';

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

                const weight = emotion.confidence || 1; // Default to 1 if no confidence

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

    const calendarDays = generateCalendarDays();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <View className="flex-1">
            {/* Calendar Card */}
            <View className="bg-white rounded-3xl shadow-xs border border-gray-100 p-4 mb-4">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6 px-2">
                    <TouchableOpacity onPress={() => navigateMonth('prev')} className="p-2">
                        <ChevronLeft size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900">
                        {formatMonthYear(currentDate)}
                    </Text>
                    <TouchableOpacity onPress={() => navigateMonth('next')} className="p-2">
                        <ChevronRight size={20} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Week Headers */}
                <View className="flex-row justify-between mb-4 px-1">
                    {weekDays.map(day => (
                        <Text key={day} className="w-[14.28%] text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            {day}
                        </Text>
                    ))}
                </View>

                {/* Days Grid */}
                <View className="flex-row flex-wrap">
                    {calendarDays.map((day, index) => {
                        const isSelected = selectedDay?.date.toDateString() === day.date.toDateString();

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    console.log('Day pressed:', day.date);
                                    setSelectedDay(day);
                                }}
                                className="w-[14.28%] aspect-square flex items-center justify-center mb-1"
                            >
                                <View
                                    className={`
                                        w-10 h-10 items-center justify-center rounded-full
                                        ${day.blendedColor ? '' : 'bg-transparent'}
                                        ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                    `}
                                    style={[
                                        day.blendedColor ? { backgroundColor: day.blendedColor } : {},
                                        isSelected && !day.blendedColor ? { backgroundColor: '#F3F4F6' } : {},
                                        isSelected ? { borderWidth: 2, borderColor: '#6366f1' } : {}
                                    ]}
                                >
                                    <Text
                                        className={`
                                            text-sm font-medium
                                            ${day.blendedColor ? 'text-white font-bold' : 'text-gray-700'}
                                            ${day.isToday && !day.blendedColor ? 'text-indigo-600 font-bold' : ''}
                                        `}
                                    >
                                        {day.date.getDate()}
                                    </Text>

                                    {/* Today Dot Indicator if no mood color */}
                                    {day.isToday && !day.blendedColor && (
                                        <View className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Selected Day Details Section */}
            {selectedDay && selectedDay.moods.length > 0 ? (
                <View className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100">
                    <Text className="font-bold text-lg text-gray-900 mb-4">
                        {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>

                    {selectedDay.moods.map((mood, idx) => (
                        <View key={idx} className="mb-4 bg-gray-50/50 rounded-xl p-4">
                            {/* Emotions Row */}
                            <View className="flex-row items-center gap-3 mb-2">
                                <View className="flex-row -space-x-1">
                                    {mood.emotions.map((e, i) => (
                                        <View
                                            key={i}
                                            className="w-3.5 h-3.5 rounded-full border border-white"
                                            style={{ backgroundColor: e.color }}
                                        />
                                    ))}
                                </View>
                                <Text className="font-medium text-gray-800 text-base capitalize">
                                    {mood.emotions.map(e => e.emotion).join(', ')}
                                </Text>
                            </View>

                            {/* Metrics */}
                            <Text className="text-sm text-gray-500 font-medium mb-1">
                                Energy: {mood.energy_level}/10 • Stress: {mood.stress_level}/10
                            </Text>

                            {/* Note */}
                            {mood.notes && (
                                <Text className="text-sm text-gray-400 italic mt-1">
                                    "{mood.notes}"
                                </Text>
                            )}
                        </View>
                    ))}
                </View>
            ) : selectedDay && (
                <View className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 items-center py-8">
                    <Text className="font-bold text-lg text-gray-900 mb-1">
                        {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text className="text-gray-400">No mood log for this day.</Text>
                </View>
            )}
        </View>
    );
}
