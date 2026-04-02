import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Settings2, BarChart3, BookMarked } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuth } from '../../stores/AuthContext';
import { moodService } from '../../services/mood.service';
import { AURORA } from '../../constants/aurora-colors';
import Analytics from '../../components/Analytics';
import {
    MOOD_COLORS,
    MOOD_EMOJIS,
    blendMoodColors,
    generateExplanation,
    type MoodLog,
} from '../../utils/blendMoods';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MoodEntry {
    id: string;
    emotions: Array<{ emotion: string; confidence: number; color: string }>;
    energy_level: number;
    stress_level: number;
    notes: string;
    log_date: Date | string;
    created_at?: Date | string;
}

interface CalendarDay {
    date: Date;
    logs: MoodLog[];
    isCurrentMonth: boolean;
    isToday: boolean;
}

function mapEmotionToMoodLog(emotionName: string): MoodLog['mood'] {
    const normalized = emotionName?.toLowerCase().trim();

    if (normalized === 'happy' || normalized === 'joy' || normalized === 'happiness') return 'Happy';
    if (normalized === 'sad' || normalized === 'sadness') return 'Sad';
    if (normalized === 'angry' || normalized === 'anger') return 'Angry';
    if (normalized === 'surprise' || normalized === 'surprised') return 'Surprise';
    if (normalized === 'neutral') return 'Neutral';

    // Keep the blend system strictly non-judgmental and limited to 5 moods.
    // Any other taxonomy coming from the backend is treated as Neutral.
    return 'Neutral';
}

function confidenceToIntensity(confidence: number): number {
    // In our flow, confidence is stored as 0–1. Convert to 1–5.
    const raw = typeof confidence === 'number' ? confidence : 0;
    return Math.max(1, Math.min(5, Math.round(raw * 5)));
}

function toMoodLogs(dayEntries: MoodEntry[]): MoodLog[] {
    const logs: MoodLog[] = [];

    for (const entry of dayEntries) {
        const emotions = Array.isArray(entry.emotions) ? entry.emotions : [];
        for (const e of emotions) {
            logs.push({
                mood: mapEmotionToMoodLog(e.emotion),
                intensity: confidenceToIntensity(e.confidence),
            });
        }
    }

    return logs;
}

function CalendarDayCell({
    dayNumber,
    logs,
    isSelected,
    onPress,
}: {
    dayNumber: number;
    logs: MoodLog[];
    isSelected: boolean;
    onPress: () => void;
}) {
    const hasLog = logs && logs.length > 0;
    const blended = blendMoodColors(logs);

    // Animate cell appearance on mount
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
        opacity.value = withTiming(1, { duration: 300 });
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={animStyle}>
            <TouchableOpacity
                onPress={onPress}
                style={[
                    styles.dayCell,
                    hasLog && {
                        backgroundColor: blended,
                        shadowColor: blended,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.75,
                        shadowRadius: 8,
                        elevation: 8,
                    },
                    isSelected && styles.selectedRing,
                ]}
            >
                <Text
                    style={[
                        styles.dayText,
                        hasLog && { color: '#ffffff', fontWeight: '700' },
                        !hasLog && { color: '#64748b' },
                    ]}
                >
                    {dayNumber}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

function CalendarLegend() {
    return (
        <View style={styles.legendWrapper}>
            <Text style={styles.legendTitle}>Mood colors</Text>
            <View style={styles.legendRow}>
                {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                    <View key={mood} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <Text style={styles.legendLabel}>{mood}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.legendNote}>
                Mixed days show a blended color based on how strongly each mood was felt.
            </Text>
        </View>
    );
}

function DayDetailsCard({ date, logs }: { date: string; logs: MoodLog[] }) {
    const blended = blendMoodColors(logs);
    const explanation = generateExplanation(logs);
    const hasLog = logs && logs.length > 0;

    return (
        <Animatable.View animation="fadeInUp" duration={400} style={styles.card}>
            {/* Blended color strip at top */}
            {hasLog && (
                <View
                    style={{
                        height: 6,
                        borderRadius: 6,
                        backgroundColor: blended,
                        marginBottom: 14,
                        shadowColor: blended,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 10,
                        elevation: 8,
                    }}
                />
            )}

            {/* Date header */}
            <Text style={styles.dateLabel}>{date}</Text>

            {hasLog ? (
                <>
                    {/* Mood chips */}
                    <View style={styles.chipsRow}>
                        {logs.map((log, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.chip,
                                    { backgroundColor: MOOD_COLORS[log.mood] + '25' },
                                ]}
                            >
                                {/* Mood emoji + name */}
                                <Text style={styles.chipEmoji}>{MOOD_EMOJIS[log.mood]}</Text>
                                <Text style={[styles.chipLabel, { color: MOOD_COLORS[log.mood] }]}>
                                    {log.mood}
                                </Text>

                                {/* Intensity dots */}
                                <View style={styles.intensityRow}>
                                    {[1, 2, 3, 4, 5].map((dot) => (
                                        <View
                                            key={dot}
                                            style={[
                                                styles.intensityDot,
                                                {
                                                    backgroundColor:
                                                        dot <= log.intensity ? MOOD_COLORS[log.mood] : '#ffffff15',
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Explanation box */}
                    <View style={styles.explanationBox}>
                        <Text style={styles.explanationText}>{explanation}</Text>
                    </View>
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No mood logged on this day.</Text>
                    <Text style={styles.emptySubText}>Tap the + button to log how you felt.</Text>
                </View>
            )}
        </Animatable.View>
    );
}

const styles = StyleSheet.create({
    // Calendar
    dayCell: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    selectedRing: {
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Legend
    legendWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 8,
    },
    legendTitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    legendNote: {
        color: '#475569',
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 4,
    },

    // Day details card
    card: {
        backgroundColor: '#0f1f3d',
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
    },
    dateLabel: {
        color: '#3b82f6',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    intensityRow: {
        flexDirection: 'row',
        gap: 3,
        marginLeft: 4,
    },
    intensityDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    explanationBox: {
        backgroundColor: '#ffffff08',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#ffffff20',
    },
    explanationText: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    emptySubText: {
        color: '#475569',
        fontSize: 12,
        marginTop: 4,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
type JournalTab = 'calendar' | 'insights';

export default function HistoryScreen() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [moodData, setMoodData] = useState<MoodEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [journalTab, setJournalTab] = useState<JournalTab>('calendar');

    useEffect(() => { if (user) loadMoodData(); }, [currentDate, user]);

    const loadMoodData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const data = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString());
            setMoodData(Array.isArray(data) ? data : []);
        } catch { setMoodData([]); } finally { setLoading(false); }
    };

    const generateCalendarDays = (): CalendarDay[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - startDay.getDay());
        const today = new Date();
        const days: CalendarDay[] = [];

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDay);
            date.setDate(startDay.getDate() + i);
            const ds = date.toISOString().split('T')[0];
            const dayMoods = moodData.filter(m => {
                if (!m?.log_date) return false;
                return (m.log_date instanceof Date ? m.log_date : new Date(m.log_date))
                    .toISOString().split('T')[0] === ds;
            });
            days.push({
                    date,
                    logs: toMoodLogs(dayMoods),
                    isCurrentMonth: date.getMonth() === month,
                    isToday: date.toDateString() === today.toDateString(),
            });
        }
        return days;
    };

    const navigateMonth = (dir: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
            return d;
        });
    };

    const calendarDays = generateCalendarDays();
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>✦</Text>
                        <View>
                            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Aurora Mood Blend</Text>
                            <Text style={{ color: AURORA.textSec, fontSize: 11 }}>MSU-IIT CCS</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: AURORA.card, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <Settings2 size={18} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {/* ── Journal / Insights toggle ───────────────────────────── */}
                    <View
                        style={{
                            flexDirection: 'row',
                            backgroundColor: AURORA.cardAlt,
                            borderRadius: 14,
                            padding: 4,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => setJournalTab('calendar')}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                paddingVertical: 10,
                                borderRadius: 12,
                                backgroundColor: journalTab === 'calendar' ? AURORA.blue : 'transparent',
                            }}
                        >
                            <BookMarked size={18} color={journalTab === 'calendar' ? '#FFF' : AURORA.textSec} />
                            <Text
                                style={{
                                    color: journalTab === 'calendar' ? '#FFF' : AURORA.textSec,
                                    fontWeight: '700',
                                    fontSize: 13,
                                }}
                            >
                                Journal
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setJournalTab('insights')}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                paddingVertical: 10,
                                borderRadius: 12,
                                backgroundColor: journalTab === 'insights' ? AURORA.blue : 'transparent',
                            }}
                        >
                            <BarChart3 size={18} color={journalTab === 'insights' ? '#FFF' : AURORA.textSec} />
                            <Text
                                style={{
                                    color: journalTab === 'insights' ? '#FFF' : AURORA.textSec,
                                    fontWeight: '700',
                                    fontSize: 13,
                                }}
                            >
                                Your week
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {journalTab === 'insights' ? (
                        <Analytics />
                    ) : (
                        <>
                    {/* ── Calendar Card ─────────────────────────────────────── */}
                    <View style={{
                        backgroundColor: AURORA.card, borderRadius: 24,
                        padding: 16, marginBottom: 20,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        {/* Month nav */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => navigateMonth('prev')} style={{ padding: 4 }}>
                                <ChevronLeft size={20} color={AURORA.textSec} />
                            </TouchableOpacity>
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{monthLabel}</Text>
                            <TouchableOpacity onPress={() => navigateMonth('next')} style={{ padding: 4 }}>
                                <ChevronRight size={20} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday headers */}
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            {weekDays.map((d, i) => (
                                <Text key={i} style={{
                                    flex: 1, textAlign: 'center', color: AURORA.textMuted,
                                    fontSize: 12, fontWeight: '700',
                                }}>{d}</Text>
                            ))}
                        </View>

                        {/* Days grid */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {calendarDays.map((day, idx) => {
                                const isSelected = selectedDay?.date.toDateString() === day.date.toDateString();
                                return (
                                    <View
                                        key={idx}
                                        style={{
                                            width: '14.28%', aspectRatio: 1,
                                            alignItems: 'center', justifyContent: 'center',
                                            paddingVertical: 2,
                                            opacity: day.isCurrentMonth ? 1 : 0.25,
                                        }}
                                    >
                                        <CalendarDayCell
                                            dayNumber={day.date.getDate()}
                                            logs={day.logs}
                                            isSelected={isSelected}
                                            onPress={() => setSelectedDay(day)}
                                        />
                                    </View>
                                );
                            })}
                        </View>

                        <CalendarLegend />
                    </View>

                    {/* ── Day Details ───────────────────────────────────────── */}
                    {selectedDay && (
                        <DayDetailsCard
                            date={selectedDay.date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                            logs={selectedDay.logs}
                        />
                    )}

                    {!selectedDay && (
                        <View style={{
                            backgroundColor: AURORA.card, borderRadius: 16,
                            padding: 20, alignItems: 'center',
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <Text style={{ color: AURORA.textSec, fontSize: 14, textAlign: 'center' }}>
                                Tap a colored day on the calendar to see your mood entries.
                            </Text>
                        </View>
                    )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
