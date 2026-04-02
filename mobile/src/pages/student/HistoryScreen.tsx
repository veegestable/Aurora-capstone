import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Settings2, BarChart3, BookMarked } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { moodService } from '../../services/mood.service';
import { AURORA, AURORA_MOOD_COLORS } from '../../constants/aurora-colors';
import Analytics from '../../components/Analytics';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MoodEntry {
    id: string;
    emotions: Array<{ emotion: string; confidence: number; color: string }>;
    energy_level: number;
    stress_level: number;
    notes: string;
    log_date: Date;
    created_at?: Date;
}

interface CalendarDay {
    date: Date;
    moods: MoodEntry[];
    isCurrentMonth: boolean;
    isToday: boolean;
    blendedColor?: string;
}

const DAY_DETAIL_ICONS: Record<string, string> = {
    joy: '😊', happy: '😊', sadness: '😢', sad: '😢',
    anger: '😠', angry: '😠', surprise: '😲', neutral: '😐',
    stressed: '😰', anxious: '😟', overwhelmed: '😩',
    relieved: '😌', productive: '🚀',
};

const EMOTION_BG: Record<string, string> = {
    joy: '#1A2D10', happy: '#1A2D10',
    sadness: '#0E1F4A', sad: '#0E1F4A',
    anger: '#3A0E1A', angry: '#3A0E1A',
    surprise: '#2D1A00', neutral: '#1A1D2E',
    stressed: '#2D1000', overwhelmed: '#3A0E0E',
    relieved: '#0E2D1A', productive: '#0E2D2D',
};

const EMOTION_COLOR: Record<string, string> = {
    joy: '#4ADE80', happy: '#4ADE80',
    sadness: '#60A5FA', sad: '#60A5FA',
    anger: '#F87171', angry: '#F87171',
    surprise: '#FB923C', neutral: '#94A3B8',
    stressed: '#F97316', overwhelmed: '#EF4444',
    relieved: '#34D399', productive: '#06B6D4',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBlendedColor(moods: MoodEntry[]): string | undefined {
    if (!moods?.length) return undefined;
    let rT = 0, gT = 0, bT = 0, wT = 0;
    moods.forEach(mood => {
        mood.emotions.forEach(e => {
            const hex = (e.color || '#94A3B8').replace('#', '');
            rT += parseInt(hex.substring(0, 2), 16) * (e.confidence || 1);
            gT += parseInt(hex.substring(2, 4), 16) * (e.confidence || 1);
            bT += parseInt(hex.substring(4, 6), 16) * (e.confidence || 1);
            wT += (e.confidence || 1);
        });
    });
    if (!wT) return undefined;
    return `rgb(${Math.round(rT / wT)},${Math.round(gT / wT)},${Math.round(bT / wT)})`;
}

function formatTime(date: Date) {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getIntensityDots(confidence: number, color: string) {
    const filled = Math.round(confidence * 5);
    return Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: i < filled ? color : 'rgba(255,255,255,0.15)',
            marginHorizontal: 1,
        }} />
    ));
}

// ─── Day Entry Row ────────────────────────────────────────────────────────────
function DayEntryRow({ entry }: { entry: MoodEntry }) {
    const primaryEmotion = entry.emotions?.[0]?.emotion?.toLowerCase() || 'neutral';
    const emotionLabel = primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1);
    const iconBg = EMOTION_BG[primaryEmotion] || '#1A1D2E';
    const iconColor = EMOTION_COLOR[primaryEmotion] || '#94A3B8';
    const moodColor = AURORA_MOOD_COLORS[primaryEmotion] || '#94A3B8';
    const confidence = entry.emotions?.[0]?.confidence || 0.5;
    const contextLabel = entry.notes ? entry.notes.split(' ').slice(0, 4).join(' ') : 'No context';

    return (
        <View style={{
            backgroundColor: AURORA.card, borderRadius: 16,
            padding: 14, flexDirection: 'row', alignItems: 'center',
            marginBottom: 10, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}>
                <Text style={{ fontSize: 22 }}>{DAY_DETAIL_ICONS[primaryEmotion] || '😶'}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{emotionLabel}</Text>
                <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                    {formatTime(entry.log_date)} • {contextLabel}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                    INTENSITY
                </Text>
                <View style={{ flexDirection: 'row' }}>
                    {getIntensityDots(confidence, iconColor)}
                </View>
            </View>
        </View>
    );
}

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
                date, moods: dayMoods,
                isCurrentMonth: date.getMonth() === month,
                isToday: date.toDateString() === today.toDateString(),
                blendedColor: getBlendedColor(dayMoods),
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
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => setSelectedDay(day)}
                                        style={{
                                            width: '14.28%', aspectRatio: 1,
                                            alignItems: 'center', justifyContent: 'center',
                                            paddingVertical: 2,
                                        }}
                                    >
                                        <View style={{
                                            width: 36, height: 36,
                                            borderRadius: 10,
                                            backgroundColor: day.blendedColor
                                                ? day.blendedColor
                                                : day.isToday
                                                    ? 'rgba(45,107,255,0.2)'
                                                    : 'transparent',
                                            alignItems: 'center', justifyContent: 'center',
                                            opacity: day.isCurrentMonth ? 1 : 0.25,
                                            borderWidth: isSelected ? 2 : 0,
                                            borderColor: '#FFFFFF',
                                        }}>
                                            <Text style={{
                                                color: day.blendedColor ? '#FFFFFF' : day.isToday ? AURORA.blue : AURORA.textSec,
                                                fontSize: 13,
                                                fontWeight: day.blendedColor || day.isToday ? '700' : '400',
                                            }}>
                                                {day.date.getDate()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── Day Details ───────────────────────────────────────── */}
                    {selectedDay && (
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Day Details</Text>
                                <Text style={{ color: AURORA.blue, fontSize: 14, fontWeight: '600' }}>
                                    {selectedDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </View>
                            {selectedDay.moods.length > 0 ? (
                                selectedDay.moods.map((entry, i) => (
                                    <DayEntryRow key={i} entry={entry} />
                                ))
                            ) : (
                                <View style={{
                                    backgroundColor: AURORA.card, borderRadius: 16,
                                    padding: 24, alignItems: 'center',
                                    borderWidth: 1, borderColor: AURORA.border,
                                }}>
                                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>No entries for this day.</Text>
                                </View>
                            )}
                        </View>
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
