import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Settings2, BarChart3, BookMarked } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SvgUri } from 'react-native-svg';
import { useAuth } from '../../stores/AuthContext';
import { useUserDaySettings } from '../../stores/UserDaySettingsContext';
import { moodService } from '../../services/mood.service';
import { AURORA } from '../../constants/aurora-colors';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import Analytics from '../../components/Analytics';
import { getDayKey } from '../../utils/dayKey';
import {
    MOOD_COLORS,
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
    sleep_quality?: 'poor' | 'fair' | 'good';
    notes: string;
    log_date: Date | string;
    created_at?: Date | string;
    event_tags?: string[];
    event_categories?: string[];
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

    dayEntries.forEach((entry, entryIndex) => {
        const emotions = Array.isArray(entry.emotions) ? entry.emotions : [];
        const rawNotes = typeof entry.notes === 'string' ? entry.notes.trim() : '';
        const notes = rawNotes.length > 0 ? rawNotes : undefined;
        const entryId = entry.id || `day-entry-${entryIndex}`;
        for (const e of emotions) {
            logs.push({
                mood: mapEmotionToMoodLog(e.emotion),
                intensity: confidenceToIntensity(e.confidence),
                entryId,
                notes,
            });
        }
    });

    return logs;
}

function toDateSafe(input: Date | string | undefined): Date {
    if (input instanceof Date) return input;
    if (typeof input === 'string') return new Date(input);
    return new Date();
}

function formatTime(input: Date | string | undefined): string {
    const d = toDateSafe(input);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getTimeBucketLabel(input: Date | string | undefined): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
    const hour = toDateSafe(input).getHours();
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
}

const EVENT_CATEGORY_BY_TAG: Record<string, 'school' | 'health' | 'social' | 'fun' | 'productivity'> = {
    classes: 'school',
    study: 'school',
    quiz: 'school',
    exam: 'school',
    homework: 'school',
    deadline: 'school',
    'group-project': 'school',
    presentation: 'school',
    headache: 'health',
    pain: 'health',
    sick: 'health',
    medication: 'health',
    exercise: 'health',
    nap: 'health',
    period: 'health',
    'low-appetite': 'health',
    'binge-eating': 'health',
    friends: 'social',
    family: 'social',
    partner: 'social',
    conflict: 'social',
    alone: 'social',
    'social-media': 'social',
    gaming: 'fun',
    'movie-series': 'fun',
    music: 'fun',
    travel: 'fun',
    shopping: 'fun',
    restaurant: 'fun',
    hobby: 'fun',
    outdoor: 'fun',
    work: 'productivity',
    chores: 'productivity',
    finance: 'productivity',
    commute: 'productivity',
    'screen-overload': 'productivity',
};

const EVENT_CATEGORY_STYLE: Record<'school' | 'health' | 'social' | 'fun' | 'productivity', { bg: string; border: string; text: string }> = {
    school: { bg: 'rgba(45,107,255,0.16)', border: 'rgba(45,107,255,0.4)', text: '#7DB0FF' },
    health: { bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.4)', text: '#34D399' },
    social: { bg: 'rgba(168,85,247,0.16)', border: 'rgba(168,85,247,0.4)', text: '#C084FC' },
    fun: { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.4)', text: '#FBBF24' },
    productivity: { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.4)', text: '#F87171' },
};

const SCHOOL_TAGS = new Set(['classes', 'study', 'quiz', 'exam', 'homework', 'deadline', 'group-project', 'presentation']);

function formatTagLabel(tag: string): string {
    return tag.replace(/-/g, ' ');
}

function formatCategoryLabel(category: string): string {
    if (category === 'fun') return 'Fun / Leisure';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function ruleBasedSchoolInsight(entry: MoodEntry): string | null {
    const tags = (Array.isArray(entry.event_tags) ? entry.event_tags : []).filter((t) => SCHOOL_TAGS.has(t));
    if (!tags.length) return null;
    const stress5 = entry.stress_level > 5 ? Math.round(entry.stress_level / 2) : entry.stress_level;
    const mood5 = entry.energy_level > 5 ? Math.round(entry.energy_level / 2) : entry.energy_level;
    const dominantEmotion = (entry.emotions?.[0]?.emotion || 'neutral').toLowerCase();
    const sleep = entry.sleep_quality || 'fair';
    const tagCount = tags.length;
    const loadBand = tagCount === 0 ? 'Light workload' : tagCount <= 2 ? 'Balanced load' : tagCount <= 4 ? 'Busy day' : 'Heavy load';
    if (mood5 >= 4 && stress5 <= 3 && sleep === 'good') {
        return `${loadBand}: good sleep and a ${dominantEmotion} mood pattern suggest you handled school demands very well.`;
    }
    if (mood5 >= 4 && stress5 <= 3) {
        return `${loadBand}: your mood-stress pattern suggests you handled school demands well.`;
    }
    if (mood5 >= 3 && stress5 <= 4) {
        return `${loadBand}: stress looks manageable. Keep pacing and recovery habits consistent.`;
    }
    if (sleep === 'poor' && stress5 >= 4) {
        return `${loadBand}: poor sleep may be amplifying stress around school activities in this check-in.`;
    }
    if (dominantEmotion === 'sad' || dominantEmotion === 'sadness' || dominantEmotion === 'anger' || dominantEmotion === 'angry') {
        return `${loadBand}: lower-valence emotion plus higher stress suggests this school period felt challenging.`;
    }
    if (dominantEmotion === 'surprise') {
        return `${loadBand}: surprise with school events may reflect sudden workload changes or time pressure.`;
    }
    return `${loadBand}: this check-in shows a tougher mood-stress pattern around school activities.`;
}

const MOOD_SVG_BY_MOOD: Record<MoodLog['mood'], any> = {
    Happy: require('../../assets/moodsSvg/happy1.svg'),
    Sad: require('../../assets/moodsSvg/sad.svg'),
    Angry: require('../../assets/moodsSvg/angry.svg'),
    Surprise: require('../../assets/moodsSvg/surprise.svg'),
    Neutral: require('../../assets/moodsSvg/neutral4.svg'),
};

function MoodIcon({ mood, size = 14 }: { mood: MoodLog['mood']; size?: number }) {
    const source = Image.resolveAssetSource(MOOD_SVG_BY_MOOD[mood]);
    if (source?.uri) return <SvgUri uri={source.uri} width={size} height={size} />;
    return <Image source={MOOD_SVG_BY_MOOD[mood]} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** One Firestore mood_log can contain multiple emotions; group so notes show once per log. */
function groupMoodLogsByEntry(logs: MoodLog[]): MoodLog[][] {
    const groups: MoodLog[][] = [];
    let current: MoodLog[] | null = null;
    let currentKey: string | undefined;

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const key = log.entryId ?? `__row_${i}`;
        if (currentKey !== key) {
            current = [log];
            currentKey = key;
            groups.push(current);
        } else {
            current!.push(log);
        }
    }

    return groups;
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

function DayDetailsCard({ date, entries }: { date: string; entries: MoodEntry[] }) {
    const logs = toMoodLogs(entries);
    const blended = blendMoodColors(logs);
    const explanation = generateExplanation(logs);
    const hasLog = logs && logs.length > 0;
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const entriesSorted = [...entries].sort(
        (a, b) => toDateSafe(b.created_at || b.log_date).getTime() - toDateSafe(a.created_at || a.log_date).getTime()
    );
    const groupedEntries = entriesSorted.reduce(
        (acc, entry) => {
            const bucket = getTimeBucketLabel(entry.created_at || entry.log_date);
            acc[bucket].push(entry);
            return acc;
        },
        {
            Morning: [] as MoodEntry[],
            Afternoon: [] as MoodEntry[],
            Evening: [] as MoodEntry[],
            Night: [] as MoodEntry[],
        }
    );
    const bucketsByLatestFirst = (['Morning', 'Afternoon', 'Evening', 'Night'] as const)
        .filter((bucket) => groupedEntries[bucket].length > 0)
        .sort((a, b) => {
            const latestA = Math.max(...groupedEntries[a].map((entry) => toDateSafe(entry.created_at || entry.log_date).getTime()));
            const latestB = Math.max(...groupedEntries[b].map((entry) => toDateSafe(entry.created_at || entry.log_date).getTime()));
            return latestB - latestA;
        });

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
                    {bucketsByLatestFirst.map((bucket) => {
                        const bucketEntries = groupedEntries[bucket];
                        if (bucketEntries.length === 0) return null;
                        return (
                            <View key={bucket} style={styles.bucketBlock}>
                                <Text style={styles.bucketHeader}>{bucket}</Text>
                                {bucketEntries.map((entry, idx) => {
                                    const group = toMoodLogs([entry]);
                                    const noteText = typeof entry.notes === 'string' ? entry.notes.trim() : '';
                                    const groupKey = entry.id || `${bucket}-entry-${idx}`;
                                    const tags = Array.isArray(entry.event_tags) ? entry.event_tags : [];
                                    const categoriesFromEntry = Array.isArray(entry.event_categories) ? entry.event_categories : [];
                                    const categories =
                                        categoriesFromEntry.length > 0
                                            ? categoriesFromEntry
                                            : Array.from(new Set(tags.map((tag) => EVENT_CATEGORY_BY_TAG[tag]).filter(Boolean)));
                                    const schoolInsight = ruleBasedSchoolInsight(entry);
                                    const expanded = expandedEntryId === groupKey;

                                    return (
                                        <TouchableOpacity
                                            key={groupKey}
                                            activeOpacity={0.85}
                                            onPress={() => setExpandedEntryId((prev) => (prev === groupKey ? null : groupKey))}
                                            style={styles.logEntryBlock}
                                        >
                                            <View style={styles.entryHeader}>
                                                <Text style={styles.entryTime}>{formatTime(entry.created_at || entry.log_date)}</Text>
                                                <Text style={styles.entryHint}>{expanded ? 'Hide details' : 'Tap for details'}</Text>
                                            </View>

                                            <View style={styles.chipsRow}>
                                                {group.map((log, index) => (
                                                    <View key={`${groupKey}-${index}`} style={[styles.chip, { backgroundColor: MOOD_COLORS[log.mood] + '25' }]}>
                                                        <MoodIcon mood={log.mood} size={14} />
                                                        <Text style={[styles.chipLabel, { color: MOOD_COLORS[log.mood] }]}>{log.mood}</Text>
                                                        <View style={styles.intensityRow}>
                                                            {[1, 2, 3, 4, 5].map((dot) => (
                                                                <View
                                                                    key={dot}
                                                                    style={[
                                                                        styles.intensityDot,
                                                                        {
                                                                            backgroundColor:
                                                                                dot <= log.intensity
                                                                                    ? MOOD_COLORS[log.mood]
                                                                                    : '#ffffff15',
                                                                        },
                                                                    ]}
                                                                />
                                                            ))}
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>

                                            {expanded ? (
                                                <View style={styles.detailsBlock}>
                                                    <Text style={styles.detailsTitle}>Context</Text>
                                                    <Text style={[styles.detailsLine, { marginBottom: tags.length > 0 ? 6 : 0 }]}>
                                                        Events:
                                                        {tags.length === 0 ? <Text style={styles.inlineNone}> None</Text> : null}
                                                    </Text>
                                                    {tags.length > 0 ? (
                                                        <View style={styles.eventPillRow}>
                                                            {tags.map((tag) => {
                                                                const category = EVENT_CATEGORY_BY_TAG[tag] || 'social';
                                                                const colorStyle = EVENT_CATEGORY_STYLE[category];
                                                                return (
                                                                    <View
                                                                        key={`${groupKey}-${tag}`}
                                                                        style={[
                                                                            styles.eventPill,
                                                                            {
                                                                                backgroundColor: colorStyle.bg,
                                                                                borderColor: colorStyle.border,
                                                                            },
                                                                        ]}
                                                                    >
                                                                        <Text style={[styles.eventPillText, { color: colorStyle.text }]}>{formatTagLabel(tag)}</Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    ) : null}
                                                    <Text style={[styles.detailsLine, { marginTop: 10, marginBottom: categories.length > 0 ? 6 : 0 }]}>
                                                        Categories:
                                                        {categories.length === 0 ? <Text style={styles.inlineNone}> None</Text> : null}
                                                    </Text>
                                                    {categories.length > 0 ? (
                                                        <View style={styles.eventPillRow}>
                                                            {categories.map((category) => {
                                                                const normalized =
                                                                    category === 'school' ||
                                                                    category === 'health' ||
                                                                    category === 'social' ||
                                                                    category === 'fun' ||
                                                                    category === 'productivity'
                                                                        ? category
                                                                        : 'social';
                                                                const colorStyle = EVENT_CATEGORY_STYLE[normalized];
                                                                return (
                                                                    <View
                                                                        key={`${groupKey}-category-${category}`}
                                                                        style={[
                                                                            styles.eventPill,
                                                                            {
                                                                                backgroundColor: colorStyle.bg,
                                                                                borderColor: colorStyle.border,
                                                                            },
                                                                        ]}
                                                                    >
                                                                        <Text style={[styles.eventPillText, { color: colorStyle.text }]}>
                                                                            {formatCategoryLabel(category)}
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    ) : null}
                                                    <View style={styles.noteBlock}>
                                                        <Text style={styles.noteLabel}>Note</Text>
                                                        <Text style={noteText ? styles.noteBody : styles.noteBodyEmpty}>
                                                            {noteText || 'No notes'}
                                                        </Text>
                                                    </View>
                                                    {schoolInsight ? (
                                                        <View style={styles.schoolInsightBlock}>
                                                            <Text style={styles.schoolInsightLabel}>Academic insight</Text>
                                                            <Text style={styles.schoolInsightText}>{schoolInsight}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })}

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
    logEntryBlock: {
        marginBottom: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.2)',
        backgroundColor: 'rgba(15,23,42,0.3)',
        padding: 10,
    },
    bucketBlock: {
        marginBottom: 12,
    },
    bucketHeader: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 2,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    entryTime: {
        color: AURORA.blue,
        fontSize: 12,
        fontWeight: '700',
    },
    entryHint: {
        color: '#94a3b8',
        fontSize: 11,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    entryNotes: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 8,
        paddingHorizontal: 2,
    },
    noteBlock: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderLeftWidth: 2,
        borderColor: AURORA.blue,
    },
    detailsBlock: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.2)',
        paddingTop: 10,
    },
    detailsTitle: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    detailsLine: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
    },
    inlineNone: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
    },
    eventPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    eventPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
    },
    eventPillText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    noteLabel: {
        color: AURORA.blue,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    noteBody: {
        color: '#e2e8f0',
        fontSize: 13,
        lineHeight: 20,
    },
    noteBodyEmpty: {
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    schoolInsightBlock: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(45,107,255,0.28)',
        backgroundColor: 'rgba(45,107,255,0.10)',
    },
    schoolInsightLabel: {
        color: AURORA.blue,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.6,
    },
    schoolInsightText: {
        color: '#dbeafe',
        fontSize: 12,
        lineHeight: 18,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
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
        borderRadius: 10,
        padding: 6,
    },
    explanationText: {
        color: '#94a3b8',
        fontSize: 11,
        lineHeight: 20,
        fontStyle: 'italic',
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

function localCalendarKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const JOURNAL_TOGGLE_PAD = 4;

/** Calendar body entrance when changing month (arrow prev / next). */
function calendarMonthGridEnter(
    reduceMotion: boolean,
    edge: 'prev' | 'next' | null
): { animation: 'fadeInLeft' | 'fadeInRight' | undefined; duration: number; useNativeDriver: true } {
    if (reduceMotion || !edge) {
        return { animation: undefined, duration: 0, useNativeDriver: true };
    }
    return {
        animation: edge === 'next' ? 'fadeInRight' : 'fadeInLeft',
        duration: 300,
        useNativeDriver: true,
    };
}

export default function HistoryScreen() {
    const { user } = useAuth();
    const { dayResetHour, timezone } = useUserDaySettings();
    const reduceMotion = useReducedMotion();
    const [currentDate, setCurrentDate] = useState(new Date());
    /** Last month change via chevron; null = initial mount (no enter animation). */
    const [calendarMonthEnter, setCalendarMonthEnter] = useState<'prev' | 'next' | null>(null);
    const [moodData, setMoodData] = useState<MoodEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [journalTab, setJournalTab] = useState<JournalTab>('calendar');
    const [journalTrackW, setJournalTrackW] = useState(0);
    const journalThumbX = useSharedValue(0);
    const journalThumbW = useSharedValue(0);
    const journalThumbStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        top: JOURNAL_TOGGLE_PAD,
        bottom: JOURNAL_TOGGLE_PAD,
        left: JOURNAL_TOGGLE_PAD,
        width: journalThumbW.value,
        transform: [{ translateX: journalThumbX.value }],
        backgroundColor: AURORA.blue,
        borderRadius: 12,
    }));

    useEffect(() => {
        if (journalTrackW <= 0) return;
        const inner = journalTrackW - JOURNAL_TOGGLE_PAD * 2;
        const seg = inner / 2;
        const idx = journalTab === 'calendar' ? 0 : 1;
        const dur = reduceMotion ? 0 : 240;
        const easing = Easing.out(Easing.cubic);
        journalThumbX.value = withTiming(idx * seg, { duration: dur, easing });
        journalThumbW.value = withTiming(seg, { duration: dur, easing });
    }, [journalTab, journalTrackW, reduceMotion]);

    useEffect(() => {
        if (!user?.id) {
            setMoodData([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const unsub = moodService.subscribeMoodLogs(
            user.id,
            (data) => {
                setMoodData(Array.isArray(data) ? (data as MoodEntry[]) : []);
                setLoading(false);
            },
            start.toISOString(),
            end.toISOString(),
            () => {
                setMoodData([]);
                setLoading(false);
            }
        );
        return unsub;
    }, [currentDate, user]);

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
            const ds = localCalendarKey(date);
            const dayMoods = moodData.filter(m => {
                if (!m?.log_date) return false;
                const logDate = m.log_date instanceof Date ? m.log_date : new Date(m.log_date);
                return localCalendarKey(logDate) === ds;
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
        setCalendarMonthEnter(dir);
        setCurrentDate((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
            return d;
        });
    };

    const calendarDays = useMemo(() => generateCalendarDays(), [moodData, currentDate, dayResetHour, timezone]);
    const dayDetailsEntries = useMemo(() => {
        if (!selectedDay) return [] as MoodEntry[];
        const selectedKey = localCalendarKey(selectedDay.date);
        return moodData.filter((m) => {
            if (!m?.log_date) return false;
            const d = m.log_date instanceof Date ? m.log_date : new Date(m.log_date);
            return localCalendarKey(d) === selectedKey;
        });
    }, [moodData, selectedDay]);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const calendarMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

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
                            
                        </View>
                    </View>
                    {/* <TouchableOpacity style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: AURORA.card, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <Settings2 size={18} color={AURORA.textSec} />
                    </TouchableOpacity> */}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {/* ── Journal / Insights toggle (sliding pill) ─────────────── */}
                    <View
                        style={{
                            backgroundColor: AURORA.cardAlt,
                            borderRadius: 14,
                            padding: JOURNAL_TOGGLE_PAD,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        onLayout={(e) => setJournalTrackW(e.nativeEvent.layout.width)}
                    >
                        <Animated.View pointerEvents="none" style={journalThumbStyle} />
                        <View style={{ flexDirection: 'row' }}>
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
                                    Analytics
                                </Text>
                            </TouchableOpacity>
                        </View>
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
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                                <Animatable.View
                                    key={`cal-month-title-${calendarMonthKey}`}
                                    animation={reduceMotion || !calendarMonthEnter ? undefined : 'fadeIn'}
                                    duration={reduceMotion ? 0 : 220}
                                    useNativeDriver
                                >
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{monthLabel}</Text>
                                </Animatable.View>
                            </View>
                            <TouchableOpacity onPress={() => navigateMonth('next')} style={{ padding: 4 }}>
                                <ChevronRight size={20} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>

                        <Animatable.View
                            key={`cal-grid-${calendarMonthKey}`}
                            {...calendarMonthGridEnter(reduceMotion, calendarMonthEnter)}
                            style={{ width: '100%' }}
                        >
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
                                    const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
                                    return (
                                        <View
                                            key={dayKey}
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
                        </Animatable.View>

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
                            entries={dayDetailsEntries}
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
