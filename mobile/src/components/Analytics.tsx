/**
 * Student "Your week" analytics — ethics-first copy, consistent Mood / Stress Index terms,
 * stagger + count-up animations (respects Reduce Motion).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert,
    AppState,
    type AppStateStatus,
    type LayoutChangeEvent,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { Sparkles, TrendingUp, CircleHelp } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
import { useUserDaySettings } from '../stores/UserDaySettingsContext';
import { moodService } from '../services/mood.service';
import {
    buildWeekSummaryInput,
    generateWeeklySummary,
} from '../services/weeklySummaryGenerate.service';
import type { MoodData } from '../services/firebase-firestore.service';
import {
    fetchWeeklyAiAnalyticsWithPayload,
    deterministicWeeklyFallback,
    WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO,
    type WeeklyAiResult,
} from '../services/weeklyAnalyticsAi.service';
import { buildLast7DaysPayload, summarizeWeekSeries } from '../utils/analytics/weeklySeries';
import { calculateCheckInStreakByDayKey } from '../utils/analytics/dateKeys';
import { getDayKey } from '../utils/dayKey';
import { moodLogsToMoodEntries } from '../utils/moodEntryNormalize';
import { aggregateByDay, aggregateByHour, moodStabilityScore } from '../utils/moodAggregates';
import { blendColors } from '../utils/blendColors';
import {
    LineTrendChart,
    ETHICS_ANALYTICS_FOOTER,
} from './analytics/DescriptiveCharts';
import { AnalyticsMoodWidgets } from './analytics/AnalyticsMoodWidgets';
import {
    averageMoodPlainLine,
} from '../utils/analytics/studentInsightsCopy';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCountUp } from '../hooks/useCountUp';
import { AURORA } from '../constants/aurora-colors';
import { getEmotionLabel } from '../utils/moodColors';
import {
    moodCategoryFromFive,
    stressCategoryFromFive,
    energyCategoryFromFive,
    sentenceCase,
} from '../utils/analytics/metricCategories';

const STREAK_MILESTONES = [3, 7, 14, 30];
const ANALYTICS_VIEW_TOGGLE_PAD = 4;
const UI_TEXT_SECONDARY = '#C1CEE9';
const UI_TEXT_MUTED = '#9AA9C8';
const UI_SECTION_GAP = 12;

/** Staggered fade-in-up for analytics panels (skipped when reduce motion is on). */
function analyticsPanelEnter(reduceMotion: boolean, delayMs: number) {
    return {
        animation: reduceMotion ? undefined : ('fadeInUp' as const),
        duration: reduceMotion ? 0 : 420,
        delay: reduceMotion ? 0 : delayMs,
        useNativeDriver: true as const,
    };
}
const SCHOOL_EVENT_TAGS = new Set([
    'classes',
    'study',
    'quiz',
    'exam',
    'homework',
    'deadline',
    'group-project',
    'presentation',
]);

function hexToRgba(hex: string, alpha: number): string {
    const cleaned = hex.replace('#', '');
    const normalized = cleaned.length === 3
        ? cleaned.split('').map((c) => c + c).join('')
        : cleaned;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function weekMoodTone(avgMood: number | null): { label: string; color: string } {
    if (avgMood == null) return { label: 'Not enough check-ins', color: AURORA.blue };
    if (avgMood >= 4.2) return { label: 'Mostly good', color: AURORA.moodHappy };
    if (avgMood >= 3.4) return { label: 'Mostly okay', color: AURORA.moodNeutral };
    if (avgMood >= 2.6) return { label: 'Ups and downs this week', color: AURORA.moodSurprise };
    return { label: 'Mostly low', color: AURORA.moodSad };
}

function normalizeEmotionBucket(raw: string): 'happy' | 'angry' | 'surprise' | 'neutral' | 'sad' | '' {
    const e = raw.toLowerCase().trim();
    if (!e) return '';
    if (e === 'joy' || e === 'happiness' || e === 'happy') return 'happy';
    if (e === 'anger' || e === 'angry') return 'angry';
    if (e === 'surprised' || e === 'surprise') return 'surprise';
    if (e === 'sadness' || e === 'sad') return 'sad';
    if (e === 'neutral') return 'neutral';
    return '';
}

type SchoolAnalysis = {
    totalSchoolEvents: number;
    schoolCheckIns: number;
    avgStress5: number;
    avgMood5: number;
    topSchoolEvents: Array<{ label: string; count: number }>;
    dominantEmotion: string;
    sleepPattern: 'mostly_good' | 'mixed' | 'mostly_poor' | 'unknown';
    summary: string;
};

type TodayEventInsight = {
    topCategory: string;
    topCategoryCount: number;
    topEvents: Array<{ label: string; count: number }>;
    categoryBreakdown: Array<{ label: string; count: number }>;
    totalTaggedCheckIns: number;
    summary: string;
};

function toFiveScale(value: unknown, fallback = 3): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (n <= 5) return Math.max(1, Math.min(5, n));
    return Math.max(1, Math.min(5, Math.round(n / 2)));
}

function humanizeLabel(value: string): string {
    return value
        .replace(/[_-]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryEmoji(label: string): string {
    const normalized = label.toLowerCase();
    if (normalized.includes('school') || normalized.includes('study') || normalized.includes('academic')) return '📚';
    if (normalized.includes('health') || normalized.includes('wellness')) return '💚';
    if (normalized.includes('social') || normalized.includes('friend')) return '🫂';
    if (normalized.includes('family') || normalized.includes('home')) return '🏠';
    if (normalized.includes('work')) return '💼';
    return '✨';
}

function analyzeTodayEvents(
    inputLogs: Array<MoodData & { log_date: Date; event_tags?: string[]; event_categories?: string[] }>
): TodayEventInsight | null {
    if (!inputLogs.length) return null;

    const categoryCount = new Map<string, number>();
    const eventCount = new Map<string, number>();
    let totalTaggedCheckIns = 0;

    for (const log of inputLogs) {
        const categories = Array.isArray(log.event_categories)
            ? log.event_categories.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            : [];
        const events = Array.isArray(log.event_tags)
            ? log.event_tags.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            : [];

        if (categories.length > 0 || events.length > 0) totalTaggedCheckIns += 1;

        for (const category of categories) {
            const key = category.toLowerCase().trim();
            categoryCount.set(key, (categoryCount.get(key) ?? 0) + 1);
        }
        for (const eventTag of events) {
            const key = eventTag.toLowerCase().trim();
            eventCount.set(key, (eventCount.get(key) ?? 0) + 1);
        }
    }

    const topCategoryEntry = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const categoryBreakdown = [...categoryCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({ label: humanizeLabel(category), count }));
    const topEvents = [...eventCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({ label: humanizeLabel(tag), count }));

    if (!topCategoryEntry && topEvents.length === 0) return null;

    const topCategory = topCategoryEntry ? humanizeLabel(topCategoryEntry[0]) : 'General';
    const topCategoryCount = topCategoryEntry?.[1] ?? 0;
    const summary = topCategoryEntry
        ? `Most of your tagged check-ins today are in ${topCategory} (${topCategoryCount}).`
        : 'Your check-ins today include event tags, but no single category was dominant.';

    return {
        topCategory,
        topCategoryCount,
        topEvents,
        categoryBreakdown,
        totalTaggedCheckIns,
        summary,
    };
}

function analyzeSchoolLogs(
    inputLogs: Array<
        MoodData & {
            log_date: Date;
            event_tags?: string[];
            event_categories?: string[];
            stress_level?: number;
            energy_level?: number;
            sleep_quality?: 'poor' | 'fair' | 'good';
            emotions?: Array<{ emotion?: string }>;
        }
    >
): SchoolAnalysis | null {
    const schoolLogs = inputLogs.filter((l) => {
        const tags = Array.isArray(l.event_tags) ? l.event_tags : [];
        return tags.some((t) => SCHOOL_EVENT_TAGS.has(t));
    });
    if (!schoolLogs.length) return null;

    const eventCount = new Map<string, number>();
    let totalSchoolEvents = 0;
    let stressSum = 0;
    let moodSum = 0;
    const emotionCount = new Map<string, number>();
    let goodSleepCount = 0;
    let poorSleepCount = 0;
    let sleepKnownCount = 0;

    for (const log of schoolLogs) {
        const tags = (Array.isArray(log.event_tags) ? log.event_tags : []).filter((t) => SCHOOL_EVENT_TAGS.has(t));
        totalSchoolEvents += tags.length;
        for (const tag of tags) eventCount.set(tag, (eventCount.get(tag) ?? 0) + 1);
        stressSum += toFiveScale(log.stress_level, 3);
        moodSum += toFiveScale(log.energy_level, 3);
        const primaryEmotion = Array.isArray(log.emotions) ? (log.emotions[0]?.emotion || '').toLowerCase() : '';
        if (primaryEmotion) emotionCount.set(primaryEmotion, (emotionCount.get(primaryEmotion) ?? 0) + 1);
        const sq = log.sleep_quality;
        if (sq === 'good' || sq === 'poor' || sq === 'fair') {
            sleepKnownCount += 1;
            if (sq === 'good') goodSleepCount += 1;
            if (sq === 'poor') poorSleepCount += 1;
        }
    }

    const avgStress5 = stressSum / schoolLogs.length;
    const avgMood5 = moodSum / schoolLogs.length;
    const topSchoolEvents = [...eventCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({ label: humanizeLabel(tag), count }));
    const dominantEmotion = [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const sleepPattern: SchoolAnalysis['sleepPattern'] =
        sleepKnownCount === 0 ? 'unknown' :
            goodSleepCount / sleepKnownCount >= 0.6 ? 'mostly_good' :
                poorSleepCount / sleepKnownCount >= 0.45 ? 'mostly_poor' : 'mixed';

    let loadBand = 'Balanced load';
    if (totalSchoolEvents === 0) {
        loadBand = 'Light workload';
    } else if (totalSchoolEvents <= 3) {
        loadBand = 'Balanced load';
    } else if (totalSchoolEvents <= 6) {
        loadBand = 'Busy load';
    } else {
        loadBand = 'Heavy load';
    }
    let summary = `${loadBand}: your school-tagged check-ins show a stable mood and stress pattern.`;
    if (avgMood5 >= 3.8 && avgStress5 <= 2.8 && sleepPattern === 'mostly_good') {
        summary = `${loadBand}: strong pattern today/this week — good sleep plus ${dominantEmotion} mood aligns with lower school stress.`;
    } else if (avgMood5 >= 3.4 && avgStress5 <= 3.3 && sleepPattern !== 'mostly_poor') {
        summary = `${loadBand}: manageable pattern — mood is steady and stress remains in a controllable range.`;
    } else if (avgStress5 >= 4 && (dominantEmotion === 'sadness' || dominantEmotion === 'anger' || dominantEmotion === 'sad')) {
        summary = `${loadBand}: stress is elevated with lower-valence emotions; reduce load where possible and add recovery breaks.`;
    } else if (sleepPattern === 'mostly_poor' && avgStress5 >= 3.3) {
        summary = `${loadBand}: poor sleep appears to coincide with higher school stress in your logs.`;
    } else if (dominantEmotion === 'neutral' && avgStress5 <= 3.6) {
        summary = `${loadBand}: neutral mood with moderate stress suggests a steady but effort-heavy school day.`;
    } else {
        summary = `${loadBand}: mixed signals across mood, stress, sleep, and emotion patterns.`;
    }

    return {
        totalSchoolEvents,
        schoolCheckIns: schoolLogs.length,
        avgStress5,
        avgMood5,
        topSchoolEvents,
        dominantEmotion,
        sleepPattern,
        summary,
    };
}

function EthicsLine() {
    return (
        <Text style={{ color: UI_TEXT_MUTED, fontSize: 11, lineHeight: 16, fontStyle: 'italic' }}>
            {ETHICS_ANALYTICS_FOOTER}
        </Text>
    );
}

/** Shimmer row — Reanimated only (avoids moti → popmotion → broken framesync in Metro). */
function SkeletonLine({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
    const opacity = useSharedValue(0.42);
    useEffect(() => {
        if (reduceMotion) {
            opacity.value = 0.55;
            return;
        }
        const start = setTimeout(() => {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.74, { duration: 880, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.34, { duration: 880, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        }, index * 90);
        return () => clearTimeout(start);
    }, [index, reduceMotion, opacity]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.View
            style={[
                {
                    height: 13,
                    width: '100%',
                    maxWidth: index === 3 ? 260 : undefined,
                    alignSelf: 'stretch',
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                },
                style,
            ]}
        />
    );
}

function AISummarySkeleton({ reduceMotion }: { reduceMotion: boolean }) {
    return (
        <View style={{ gap: 12, paddingVertical: 4 }}>
            {[0, 1, 2, 3].map((i) => (
                <SkeletonLine key={i} index={i} reduceMotion={reduceMotion} />
            ))}
        </View>
    );
}

function BreathingEmptyState() {
    const scale = useSharedValue(1);
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, [scale]);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Animated.View style={[{ alignItems: 'center', paddingVertical: 24, marginBottom: 8 }, style]}>
            <Text style={{ fontSize: 44 }}>🌿</Text>
            <Text style={{ color: AURORA.textSec, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                Start logging to see your week come to life.
            </Text>
        </Animated.View>
    );
}

function ChartSection({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                backgroundColor: AURORA.card,
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: AURORA.border,
            }}
        >
            {children}
        </View>
    );
}

export default function Analytics() {
    const { user } = useAuth();
    const { dayResetHour, timezone } = useUserDaySettings();
    const reduceMotion = useReducedMotion();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [weekSummaryGenerating, setWeekSummaryGenerating] = useState(false);
    const [weekSummarySource, setWeekSummarySource] = useState<'ai' | 'fallback' | null>(null);
    const [analyticsView, setAnalyticsView] = useState<'today' | 'week'>('today');
    /** Measured relative to the inner row (thumb uses same coords + outer horizontal padding). */
    const [analyticsViewSegments, setAnalyticsViewSegments] = useState<{
        today: { x: number; w: number };
        week: { x: number; w: number };
    }>({
        today: { x: 0, w: 0 },
        week: { x: 0, w: 0 },
    });
    const [weekSummaryTemplate, setWeekSummaryTemplate] = useState('');
    const [activeWeekPill, setActiveWeekPill] = useState<'days' | 'checkins' | 'streak' | null>(null);
    const [logs, setLogs] = useState<(MoodData & { log_date: Date; id?: string })[]>([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [weeklyAi, setWeeklyAi] = useState<WeeklyAiResult | null>(null);
    const [celebrateMilestone, setCelebrateMilestone] = useState(false);
    const prevStreakRef = useRef<number | null>(null);
    const isRefreshingLogsRef = useRef(false);
    const latestLogsRef = useRef<(MoodData & { log_date: Date; id?: string })[]>([]);

    const analyticsViewThumbX = useSharedValue(0);
    const analyticsViewThumbW = useSharedValue(0);
    const analyticsViewThumbStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        top: ANALYTICS_VIEW_TOGGLE_PAD,
        bottom: ANALYTICS_VIEW_TOGGLE_PAD,
        left: ANALYTICS_VIEW_TOGGLE_PAD,
        width: analyticsViewThumbW.value,
        transform: [{ translateX: analyticsViewThumbX.value }],
        backgroundColor: AURORA.purple,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
    }));

    useEffect(() => {
        latestLogsRef.current = logs;
    }, [logs]);

    const onAnalyticsViewSegmentLayout = useCallback(
        (key: 'today' | 'week', e: LayoutChangeEvent) => {
            const { x, width } = e.nativeEvent.layout;
            setAnalyticsViewSegments((prev) => {
                const next = { ...prev, [key]: { x, w: width } };
                if (prev[key].x === next[key].x && prev[key].w === next[key].w) return prev;
                return next;
            });
        },
        []
    );

    useEffect(() => {
        const seg = analyticsView === 'today' ? analyticsViewSegments.today : analyticsViewSegments.week;
        if (seg.w <= 0) return;
        const dur = reduceMotion ? 0 : 240;
        const easing = Easing.out(Easing.cubic);
        analyticsViewThumbX.value = withTiming(seg.x, { duration: dur, easing });
        analyticsViewThumbW.value = withTiming(seg.w, { duration: dur, easing });
    }, [analyticsView, analyticsViewSegments, reduceMotion]);

    const prevAnalyticsViewPanelRef = useRef<'today' | 'week' | null>(null);
    const [todayPanelAnimKey, setTodayPanelAnimKey] = useState(0);
    const [weekPanelAnimKey, setWeekPanelAnimKey] = useState(0);
    useEffect(() => {
        const prev = prevAnalyticsViewPanelRef.current;
        if (analyticsView === 'today' && prev !== 'today') {
            setTodayPanelAnimKey((k) => k + 1);
        }
        if (analyticsView === 'week' && prev !== 'week') {
            setWeekPanelAnimKey((k) => k + 1);
        }
        prevAnalyticsViewPanelRef.current = analyticsView;
    }, [analyticsView]);

    const refreshMoodLogs = useCallback(
        async (opts?: { setBusyState?: boolean }): Promise<(MoodData & { log_date: Date })[]> => {
            if (!user) return [];
            if (isRefreshingLogsRef.current) return latestLogsRef.current as (MoodData & { log_date: Date })[];

            const shouldSetBusyState = opts?.setBusyState ?? false;
            if (shouldSetBusyState) setRefreshing(true);
            isRefreshingLogsRef.current = true;

            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 45);
                const moodLogs = await moodService.getMoodLogs(user.id, startDate.toISOString(), endDate.toISOString());
                const list = (moodLogs || []) as (MoodData & { log_date: Date })[];
                setLogs(list);
                setLastUpdatedAt(new Date());
                return list;
            } catch (e) {
                console.error('Analytics logs refresh failed', e);
                if (shouldSetBusyState) setLogs([]);
                return [];
            } finally {
                isRefreshingLogsRef.current = false;
                if (shouldSetBusyState) setRefreshing(false);
            }
        },
        [user]
    );

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const list = await refreshMoodLogs();
            setLoading(false);
            setRefreshing(false);

            const today = new Date();
            today.setHours(12, 0, 0, 0);
            try {
                setWeekSummaryGenerating(true);
                setWeekSummaryTemplate('');
                setWeekSummarySource(null);
                const input = buildWeekSummaryInput(list, dayResetHour, timezone);
                const summary = await generateWeeklySummary(input);
                setWeekSummaryTemplate(summary.summary);
                setWeekSummarySource(summary.source);
            } catch {
                setWeekSummaryTemplate('');
                setWeekSummarySource('fallback');
            } finally {
                setWeekSummaryGenerating(false);
            }

            setAiLoading(true);
            setWeeklyAi(null);
            try {
                const payload = buildLast7DaysPayload(list);
                const ai = await fetchWeeklyAiAnalyticsWithPayload(payload);
                setWeeklyAi(ai);
            } catch {
                setWeeklyAi(deterministicWeeklyFallback(buildLast7DaysPayload(list)));
            } finally {
                setAiLoading(false);
            }
        } catch (e) {
            console.error('Analytics load failed', e);
            setLogs([]);
            setWeeklyAi(null);
            setLoading(false);
            setRefreshing(false);
            setAiLoading(false);
            setWeekSummaryGenerating(false);
        }
    }, [user, dayResetHour, timezone, refreshMoodLogs]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            load();
        }
    }, [user, load]);

    const streak = useMemo(() => {
        const keys = new Set(
            moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone)
                .map((e) => e.dayKey)
                .filter((x): x is string => !!x)
        );
        return calculateCheckInStreakByDayKey(keys, new Date(), dayResetHour, timezone);
    }, [logs, dayResetHour, timezone]);

    const todayMoodAgg = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        return aggregateByDay(entries, dk);
    }, [logs, dayResetHour, timezone]);

    const todayEntries = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        return entries.filter((e) => e.dayKey === dk);
    }, [logs, dayResetHour, timezone]);

    const todayHourly = useMemo(() => aggregateByHour(todayEntries), [todayEntries]);

    const todayLineLabels = useMemo(
        () => Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`),
        []
    );

    const todayLineValues = useMemo(() => {
        const byHour = new Map<number, number>();
        for (const h of todayHourly) byHour.set(h.hour, h.avgIntensity);
        return Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? null);
    }, [todayHourly]);
    const todayLinePointCount = useMemo(
        () => todayLineValues.reduce<number>((count, value) => (value == null ? count : count + 1), 0),
        [todayLineValues]
    );

    const todayBlended = useMemo(() => {
        if (!todayEntries.length) return AURORA.blue;
        return blendColors(todayEntries.map((e) => ({ color: e.color, intensity: e.intensity })));
    }, [todayEntries]);

    const todayStability = useMemo(() => {
        const intensities = todayEntries.map((e) => e.intensity);
        return moodStabilityScore(intensities);
    }, [todayEntries]);

    const weekMoodFromEntries = useMemo(() => {
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const keySet = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            keySet.add(getDayKey(d, dayResetHour, timezone));
        }
        const slice = entries.filter((x) => keySet.has(x.dayKey || ''));
        if (!slice.length) return null;
        const scales = slice.map((x) => Math.min(5, Math.max(1, Math.ceil(x.intensity / 2))));
        return scales.reduce((a, b) => a + b, 0) / scales.length;
    }, [logs, dayResetHour, timezone]);
    useEffect(() => {
        if (reduceMotion) {
            prevStreakRef.current = streak;
            return;
        }
        const prev = prevStreakRef.current;
        if (prev === null) {
            prevStreakRef.current = streak;
            return;
        }
        if (STREAK_MILESTONES.includes(streak) && streak > prev) {
            setCelebrateMilestone(true);
            const t = setTimeout(() => setCelebrateMilestone(false), 2200);
            prevStreakRef.current = streak;
            return () => clearTimeout(t);
        }
        prevStreakRef.current = streak;
    }, [streak, reduceMotion]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    useEffect(() => {
        if (!user || analyticsView !== 'today') return;

        const intervalMs = 30_000;
        const intervalId = setInterval(() => {
            void refreshMoodLogs();
        }, intervalMs);

        return () => clearInterval(intervalId);
    }, [user, analyticsView, refreshMoodLogs]);

    useEffect(() => {
        if (!user || analyticsView !== 'today') return;

        const onAppStateChange = (state: AppStateStatus) => {
            if (state === 'active') {
                void refreshMoodLogs();
            }
        };

        const sub = AppState.addEventListener('change', onAppStateChange);
        return () => sub.remove();
    }, [user, analyticsView, refreshMoodLogs]);

    const weeklyPayload = buildLast7DaysPayload(logs as (MoodData & { log_date: Date })[]);
    const weekCard = summarizeWeekSeries(weeklyPayload);

    const totalCheckIns = logs.length;
    const weekDaysLogged = weeklyPayload.daily_mood.filter((m) => m >= 1 && m <= 5).length;

    const displayWeekAvgMood = weekMoodFromEntries ?? weekCard.avgMood;
    const animStreak = useCountUp(streak, 640, true, reduceMotion);
    const weekMoodMeta = useMemo(() => weekMoodTone(displayWeekAvgMood), [displayWeekAvgMood]);
    const todayDayLogs = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        return (logs as Array<MoodData & { log_date: Date; event_tags?: string[]; event_categories?: string[] }>)
            .filter((l) => getDayKey(new Date(l.log_date), dayResetHour, timezone) === dk);
    }, [logs, dayResetHour, timezone]);
    const todaySchoolAnalysis = useMemo(() => {
        return analyzeSchoolLogs(todayDayLogs as any);
    }, [todayDayLogs]);
    const todayEventInsight = useMemo(() => analyzeTodayEvents(todayDayLogs), [todayDayLogs]);
    const weekSchoolAnalysis = useMemo(() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const keySet = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            keySet.add(getDayKey(d, dayResetHour, timezone));
        }
        const weekLogs = (logs as Array<MoodData & { log_date: Date; event_tags?: string[]; event_categories?: string[] }>)
            .filter((l) => keySet.has(getDayKey(new Date(l.log_date), dayResetHour, timezone)));
        return analyzeSchoolLogs(weekLogs as any);
    }, [logs, dayResetHour, timezone]);
    const weekAcademicSummaryLine = useMemo(() => {
        if (!weekSchoolAnalysis) return 'No school-tagged check-ins in the last 7 days.';
        const topEvents = weekSchoolAnalysis.topSchoolEvents.length > 0
            ? weekSchoolAnalysis.topSchoolEvents.map((e) => `${e.label} (${e.count})`).join(', ')
            : 'no frequent school events yet';
        return `Academic pattern: ${weekSchoolAnalysis.summary}`;
    }, [weekSchoolAnalysis]);
    const last7DayKeySet = useMemo(() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const keySet = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            keySet.add(getDayKey(d, dayResetHour, timezone));
        }
        return keySet;
    }, [dayResetHour, timezone]);
    const last7Logs = useMemo(() => {
        return (logs as Array<MoodData & { log_date: Date; sleep_quality?: 'poor' | 'fair' | 'good'; emotions?: Array<{ emotion?: string }>; stress_level?: number; energy_level?: number }>)
            .filter((l) => last7DayKeySet.has(getDayKey(new Date(l.log_date), dayResetHour, timezone)));
    }, [logs, last7DayKeySet, dayResetHour, timezone]);
    const weekWellnessStats = useMemo(() => {
        if (last7Logs.length === 0) {
            return {
                stressLabel: 'not enough stress data',
                energyLabel: 'not enough energy data',
                stability: null as number | null,
                sleepLabel: 'not enough sleep data',
                emotionLabel: 'not enough emotion data',
            };
        }
        let stressSum = 0;
        let stressN = 0;
        let energySum = 0;
        let energyN = 0;
        let sleepGood = 0;
        let sleepFair = 0;
        let sleepPoor = 0;
        const emotionCount = new Map<string, number>();
        for (const log of last7Logs) {
            if (typeof log.stress_level === 'number') {
                stressSum += toFiveScale(log.stress_level, 3);
                stressN += 1;
            }
            if (typeof log.energy_level === 'number') {
                energySum += toFiveScale(log.energy_level, 3);
                energyN += 1;
            }
            const sq = log.sleep_quality;
            if (sq === 'good') sleepGood += 1;
            else if (sq === 'fair') sleepFair += 1;
            else if (sq === 'poor') sleepPoor += 1;
            const primaryEmotion = Array.isArray(log.emotions) ? normalizeEmotionBucket(log.emotions[0]?.emotion || '') : '';
            if (primaryEmotion.length > 0) {
                emotionCount.set(primaryEmotion, (emotionCount.get(primaryEmotion) ?? 0) + 1);
            }
        }
        const stressAvg = stressN > 0 ? stressSum / stressN : null;
        const energyAvg = energyN > 0 ? energySum / energyN : null;
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone)
            .filter((e) => !!e.dayKey && last7DayKeySet.has(e.dayKey));
        const stability = entries.length > 0 ? moodStabilityScore(entries.map((e) => e.intensity)) : null;
        const sleepKnown = sleepGood + sleepFair + sleepPoor;
        let sleepLabel = 'not enough sleep data';
        if (sleepKnown > 0) {
            if (sleepGood >= sleepFair && sleepGood >= sleepPoor) sleepLabel = 'mostly good';
            else if (sleepPoor >= sleepGood && sleepPoor >= sleepFair) sleepLabel = 'mostly poor';
            else sleepLabel = 'mostly fair';
        }
        const dominantEmotion = [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const emotionLabel = dominantEmotion ? dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1) : 'not enough emotion data';
        return {
            stressLabel: stressCategoryFromFive(stressAvg),
            energyLabel: energyCategoryFromFive(energyAvg),
            stability,
            sleepLabel,
            emotionLabel,
        };
    }, [last7Logs, logs, dayResetHour, timezone, last7DayKeySet]);
    const weekAverageMoodColor = useMemo(() => {
        const key = (weekWellnessStats.emotionLabel || '').toLowerCase().trim();
        if (key === 'happy' || key === 'joy' || key === 'happiness') return AURORA.moodHappy;
        if (key === 'sad' || key === 'sadness') return AURORA.moodSad;
        if (key === 'angry' || key === 'anger') return AURORA.moodAngry;
        if (key === 'neutral') return AURORA.moodNeutral;
        if (key === 'surprise' || key === 'surprised') return AURORA.moodSurprise;
        return weekMoodMeta.color;
    }, [weekWellnessStats.emotionLabel, weekMoodMeta.color]);

    const showStabilityInfo = () => {
        Alert.alert(
            'Today mood stability',
            'This score reflects how steady your mood intensity is across today\'s check-ins. A higher percentage means your mood pattern was more consistent.'
        );
    };
    const weekBestWorstInsight = useMemo(() => {
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        const points: Array<{ label: string; avgIntensity: number; avgStress: number; dominantEmotion: 'happy' | 'angry' | 'surprise' | 'neutral' | 'sad' | '' }> = [];
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = getDayKey(d, dayResetHour, timezone);
            const agg = aggregateByDay(entries, key);
            const dayLogs = last7Logs.filter((l) => getDayKey(new Date(l.log_date), dayResetHour, timezone) === key);
            const dayEmotionCount = new Map<string, number>();
            for (const log of dayLogs) {
                const norm = Array.isArray(log.emotions) ? normalizeEmotionBucket(log.emotions[0]?.emotion || '') : '';
                if (norm) dayEmotionCount.set(norm, (dayEmotionCount.get(norm) ?? 0) + 1);
            }
            const dominantEmotion = [...dayEmotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as
                | 'happy'
                | 'angry'
                | 'surprise'
                | 'neutral'
                | 'sad'
                | undefined;
            if (agg.entryCount > 0) {
                points.push({
                    label: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    avgIntensity: agg.avgIntensity,
                    avgStress: agg.avgStress,
                    dominantEmotion: dominantEmotion ?? '',
                });
            }
        }
        if (points.length < 2) return '';
        let best = points[0];
        let hardest = points[0];
        for (const p of points) {
            const emotionBonus = p.dominantEmotion === 'happy' ? 1.1
                : p.dominantEmotion === 'surprise' ? 0.35
                    : p.dominantEmotion === 'neutral' ? 0.15
                        : p.dominantEmotion === 'sad' ? -0.65
                            : p.dominantEmotion === 'angry' ? -0.85
                                : 0;
            const bestScore = p.avgIntensity - (p.avgStress * 1.1) + emotionBonus;
            const prevBestBonus = best.dominantEmotion === 'happy' ? 1.1
                : best.dominantEmotion === 'surprise' ? 0.35
                    : best.dominantEmotion === 'neutral' ? 0.15
                        : best.dominantEmotion === 'sad' ? -0.65
                            : best.dominantEmotion === 'angry' ? -0.85
                                : 0;
            const prevBestScore = best.avgIntensity - (best.avgStress * 1.1) + prevBestBonus;
            if (bestScore > prevBestScore) best = p;
            const currentRank = -p.avgIntensity + p.avgStress;
            const hardestRank = -hardest.avgIntensity + hardest.avgStress;
            if (currentRank > hardestRank) hardest = p;
        }
        return `You felt best on ${best.label} and most stressed on ${hardest.label}.`;
    }, [logs, dayResetHour, timezone, last7Logs]);
    const lastUpdatedLabel = useMemo(() => {
        if (!lastUpdatedAt) return 'Updated just now';
        return `Updated ${lastUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }, [lastUpdatedAt]);

    const trendPlainSentence = useMemo(() => {
        if (!weeklyAi) return '';
        switch (weeklyAi.trend) {
            case 'Improving':
                return 'Later days in the last 7 days showed higher mood numbers than earlier days (from your logs only).';
            case 'Declining':
                return 'Later days in the last 7 days showed lower mood numbers than earlier days (from your logs only).';
            case 'Stable':
            default:
                return 'Early and late days in the last 7 days stayed in a similar mood range (from your logs only).';
        }
    }, [weeklyAi]);
    const weeklySummaryBody = useMemo(() => {
        const stabilityLine = weekWellnessStats.stability != null
            ? `${weekWellnessStats.stability}% mood stability`
            : 'not enough stability data';
        const base =
            `In the last 7 days, stress was ${weekWellnessStats.stressLabel}, energy was ${weekWellnessStats.energyLabel}, ` +
            `sleep quality looked ${weekWellnessStats.sleepLabel}, mood stability was ${stabilityLine}, and the most common emotion was ${weekWellnessStats.emotionLabel}.`;
        const withBestWorst = weekBestWorstInsight ? `${base} ${weekBestWorstInsight}` : base;
        return `${withBestWorst} ${weekAcademicSummaryLine}`;
    }, [weekWellnessStats, weekBestWorstInsight, weekAcademicSummaryLine]);
    const stressLabelFriendly = useMemo(() => {
        const raw = (weekWellnessStats.stressLabel || '').toLowerCase().trim();
        if (raw === 'very stressed') return 'high';
        if (raw === 'stressed') return 'elevated';
        return raw || 'not enough data';
    }, [weekWellnessStats.stressLabel]);

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <ActivityIndicator color={AURORA.blue} />
                <Text style={{ color: AURORA.textSec, marginTop: 12 }}>Loading your analytics…</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 72 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AURORA.blue} />}
        >
            {totalCheckIns === 0 ? (
                reduceMotion ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 8 }}>
                        <Text style={{ fontSize: 44 }}>🌿</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                            Start logging to see your week come to life.
                        </Text>
                    </View>
                ) : (
                    <BreathingEmptyState />
                )
            ) : null}

            <View style={{ marginBottom: UI_SECTION_GAP }}>
                <View
                    style={{
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(124, 58, 237, 0.16)',
                        borderRadius: 999,
                        padding: ANALYTICS_VIEW_TOGGLE_PAD,
                        borderWidth: 1,
                        borderColor: 'rgba(124, 58, 237, 0.38)',
                        shadowColor: '#7C3AED',
                        shadowOpacity: 0.22,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 4,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <Animated.View pointerEvents="none" style={analyticsViewThumbStyle} />
                    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                        <TouchableOpacity
                            onPress={() => setAnalyticsView('today')}
                            onLayout={(e) => onAnalyticsViewSegmentLayout('today', e)}
                            style={{
                                width: 104,
                                minWidth: 72,
                                paddingVertical: 7,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.85}
                                style={{
                                    color: analyticsView === 'today' ? '#FFFFFF' : AURORA.textMuted,
                                    fontWeight: '700',
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}
                            >
                                Today
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setAnalyticsView('week')}
                            onLayout={(e) => onAnalyticsViewSegmentLayout('week', e)}
                            style={{
                                width: 104,
                                minWidth: 72,
                                paddingVertical: 7,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.85}
                                style={{
                                    color: analyticsView === 'week' ? '#FFFFFF' : AURORA.textMuted,
                                    fontWeight: '700',
                                    fontSize: 12,
                                    textAlign: 'center',
                                }}
                            >
                                7 days
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={{ color: UI_TEXT_MUTED, fontSize: 11, marginTop: 6 }}>
                    {lastUpdatedLabel}
                </Text>
            </View>

            {analyticsView === 'today' ? (
                <View key={`today-open-${todayPanelAnimKey}`}>
                    <Animatable.View {...analyticsPanelEnter(reduceMotion, 0)}>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
                            Today
                        </Text>
                        <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 14, lineHeight: 21, marginBottom: UI_SECTION_GAP }}>
                            Focused insights from your current day.
                        </Text>
                    </Animatable.View>

                    <ChartSection>
                        {todayEntries.length === 0 ? (
                            <Animatable.View {...analyticsPanelEnter(reduceMotion, 70)}>
                                <Text style={{ color: AURORA.textSec, fontSize: 14 }}>
                                    No check-ins yet today. Log your mood to unlock daily analytics.
                                </Text>
                            </Animatable.View>
                        ) : (
                            <>
                                <Animatable.View {...analyticsPanelEnter(reduceMotion, 60)}>
                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                        <View style={{ flex: 1, backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12 }}>
                                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>TODAY MOOD</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: todayBlended }} />
                                                <Text style={{ color: AURORA.textPrimary, fontSize: 16, fontWeight: '700' }}>
                                                    {getEmotionLabel(todayMoodAgg.dominantMood)}
                                                </Text>
                                            </View>
                                            <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12, marginTop: 6 }}>
                                                Avg intensity {todayMoodAgg.avgIntensity.toFixed(1)}/10
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12 }}>
                                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>CHECK-INS</Text>
                                            <Text style={{ color: AURORA.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 6 }}>
                                                {todayMoodAgg.entryCount}
                                            </Text>
                                            <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12 }}>today</Text>
                                        </View>
                                    </View>
                                </Animatable.View>
                                <Animatable.View {...analyticsPanelEnter(reduceMotion, 130)}>
                                    <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: UI_SECTION_GAP }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                                TODAY MOOD STABILITY
                                            </Text>
                                            <TouchableOpacity
                                                onPress={showStabilityInfo}
                                                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                                style={{ padding: 2 }}
                                            >
                                                <CircleHelp size={13} color={UI_TEXT_MUTED} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
                                            <Text style={{ color: todayBlended, fontSize: 30, fontWeight: '900' }}>
                                                {todayStability}%
                                            </Text>
                                            <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12, marginBottom: 6 }}>
                                                based on today&apos;s check-ins
                                            </Text>
                                        </View>
                                    </View>
                                </Animatable.View>
                        {todaySchoolAnalysis ? (
                            <Animatable.View {...analyticsPanelEnter(reduceMotion, 200)}>
                            <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: UI_SECTION_GAP }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 8 }}>
                                    ACADEMIC ANALYTICS (TODAY)
                                </Text>

                                <Text style={{ color: UI_TEXT_MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                                    INSIGHT
                                </Text>
                                <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 }}>
                                    {todaySchoolAnalysis.summary}
                                </Text>

                                <Text style={{ color: UI_TEXT_MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 10 }}>
                                    SIGNALS
                                </Text>
                                <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                                    School events: {todaySchoolAnalysis.totalSchoolEvents} across {todaySchoolAnalysis.schoolCheckIns} check-in(s)
                                </Text>
                                <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12, marginTop: 2 }}>
                                    Mood: {sentenceCase(moodCategoryFromFive(todaySchoolAnalysis.avgMood5))} • Stress: {sentenceCase(stressCategoryFromFive(todaySchoolAnalysis.avgStress5))}
                                </Text>
                                {todaySchoolAnalysis.topSchoolEvents.length > 0 ? (
                                    <View style={{ marginTop: 8, gap: 6 }}>
                                        <Text style={{ color: UI_TEXT_MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 }}>
                                            TOP STRESSORS
                                        </Text>
                                        {todaySchoolAnalysis.topSchoolEvents.map((item) => {
                                            const maxCount = Math.max(1, todaySchoolAnalysis.topSchoolEvents[0]?.count ?? 1);
                                            const widthPct = Math.max(18, Math.round((item.count / maxCount) * 100));
                                            return (
                                                <View key={`today-school-${item.label}`}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                                        <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700' }}>{item.label}</Text>
                                                        <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700' }}>{item.count}</Text>
                                                    </View>
                                                    <View style={{ height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                                        <View style={{ width: `${widthPct}%`, height: 7, borderRadius: 999, backgroundColor: AURORA.blue }} />
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                            </Animatable.View>
                        ) : null}
                        <Animatable.View {...analyticsPanelEnter(reduceMotion, 270)}>
                        <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                TODAY EVENT FOCUS
                            </Text>
                            {todayEventInsight ? (
                                <>
                                    <View
                                        style={{
                                            marginTop: 8,
                                            backgroundColor: 'rgba(124, 58, 237, 0.14)',
                                            borderColor: 'rgba(124, 58, 237, 0.28)',
                                            borderWidth: 1,
                                            borderRadius: 12,
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        <Text style={{ color: AURORA.textPrimary, fontSize: 13, fontWeight: '800' }}>
                                            {categoryEmoji(todayEventInsight.topCategory)} {todayEventInsight.topCategory}
                                        </Text>
                                        <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 2 }}>
                                            Most used category today
                                        </Text>
                                    </View>
                                    {todayEventInsight.categoryBreakdown.length > 0 ? (
                                        <View style={{ marginTop: 10, gap: 7 }}>
                                            {todayEventInsight.categoryBreakdown.map((item) => {
                                                const widthPct = Math.max(
                                                    18,
                                                    Math.round((item.count / Math.max(1, todayEventInsight.topCategoryCount)) * 100)
                                                );
                                                return (
                                                    <View key={`category-${item.label}`}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700' }}>
                                                                {item.label}
                                                            </Text>
                                                            <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700' }}>
                                                                {item.count}
                                                            </Text>
                                                        </View>
                                                        <View style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)' }}>
                                                            <View
                                                                style={{
                                                                    width: `${widthPct}%`,
                                                                    height: 8,
                                                                    borderRadius: 999,
                                                                    backgroundColor: AURORA.purple,
                                                                }}
                                                            />
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : null}
                                </>
                            ) : (
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                                    No event tags in today&apos;s check-ins yet.
                                </Text>
                            )}
                        </View>
                        </Animatable.View>
                        <Animatable.View {...analyticsPanelEnter(reduceMotion, 340)}>
                        {todayLinePointCount >= 2 ? (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 8 }}>
                                    HOURLY TREND
                                </Text>
                                <LineTrendChart
                                    title="Mood spikes in 24 hours"
                                    caption="Higher points show hours where your mood intensity peaked."
                                    values={todayLineValues}
                                    labels={todayLineLabels}
                                    yMin={1}
                                    yMax={10}
                                    stroke={todayBlended}
                                    friendlyAxis={{
                                        high: 'High',
                                        mid: 'Mid',
                                        low: 'Low',
                                    }}
                                    chartHeight={180}
                                    xSlot={30}
                                    labelEvery={3}
                                    zoomable
                                />
                            </View>
                        ) : (
                            <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                    HOURLY TREND
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                                    Log at least 2 check-ins today to unlock the hourly trend graph.
                                </Text>
                            </View>
                        )}
                        </Animatable.View>
                    </>
                )}
            </ChartSection>
                </View>
            ) : null}

            {analyticsView === 'week' ? (
                <View key={`week-open-${weekPanelAnimKey}`}>
                    <Animatable.View {...analyticsPanelEnter(reduceMotion, 0)}>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
                            Your last 7 days
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>
                            Quick mood highlights from your last 7 days.
                        </Text>
                        <EthicsLine />
                    </Animatable.View>

            <View style={{ marginTop: 18, marginBottom: 8 }}>
                <Animatable.View {...analyticsPanelEnter(reduceMotion, 80)}>
                {(() => {
                    const weekPills = [
                        { key: 'days' as const, label: 'Days logged', value: `${weekDaysLogged}/7`},
                        { key: 'checkins' as const, label: 'Check-ins', value: String(totalCheckIns) },
                        { key: 'streak' as const, label: 'Streak', value: String(Math.round(animStreak)) },
                    ];
                    const explainer = activeWeekPill === 'days'
                        ? `${weekDaysLogged} out of 7 days had at least one mood check-in.`
                        : activeWeekPill === 'checkins'
                            ? `You logged ${totalCheckIns} mood entries in the last 7 days.`
                            : activeWeekPill === 'streak'
                                    ? `You are on a ${Math.round(animStreak)} day streak.`
                                    : null;
                    return (
                        <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {weekPills.map((pill) => (
                            <TouchableOpacity
                                key={pill.label}
                                activeOpacity={0.9}
                                onPress={() => setActiveWeekPill((prev) => (prev === pill.key ? null : pill.key))}
                                style={{
                                    width: 113,
                                    backgroundColor: activeWeekPill === pill.key ? 'rgba(45, 107, 255, 0.18)' : 'rgba(15, 24, 64, 0.88)',
                                    padding: 13,
                                    borderRadius: 18,
                                    borderWidth: 1,
                                    borderColor: activeWeekPill === pill.key ? AURORA.blue : AURORA.border,
                                    shadowColor: activeWeekPill === pill.key ? AURORA.blue : '#000',
                                    shadowOpacity: activeWeekPill === pill.key ? 0.28 : 0.18,
                                    shadowRadius: activeWeekPill === pill.key ? 10 : 8,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: activeWeekPill === pill.key ? 5 : 3,
                                }}
                            >
                                <Text style={{ color: UI_TEXT_MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }}>
                                    {pill.label.toUpperCase()}
                                </Text>
                                <Text style={{ color: AURORA.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 8 }}>
                                    {pill.value}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
                <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 11, marginBottom: 10 }}>
                    Based on your last 7 days of check-ins.
                </Text>
                {explainer ? (
                    <View
                        style={{
                            backgroundColor: 'rgba(45, 107, 255, 0.12)',
                            borderWidth: 1,
                            borderColor: 'rgba(45, 107, 255, 0.28)',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 17 }}>{explainer}</Text>
                    </View>
                ) : null}
                        </>
                    );
                })()}
                </Animatable.View>

                <Animatable.View
                    animation={reduceMotion ? undefined : 'fadeInUp'}
                    duration={reduceMotion ? 0 : 520}
                    delay={reduceMotion ? 0 : 160}
                    useNativeDriver
                    style={{
                        width: '100%',
                        backgroundColor: hexToRgba(weekAverageMoodColor, 0.14),
                        padding: 20,
                        borderRadius: 22,
                        marginBottom: 20,
                        borderWidth: 1.5,
                        borderColor: hexToRgba(weekAverageMoodColor, 0.75),
                        shadowColor: weekAverageMoodColor,
                        shadowOpacity: 0.26,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 7,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TrendingUp size={22} color={weekAverageMoodColor} />
                            <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>
                                AVERAGE MOOD (7 DAYS)
                            </Text>
                        </View>
                        <View style={{ backgroundColor: hexToRgba(weekAverageMoodColor, 0.22), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: weekAverageMoodColor, fontSize: 11, fontWeight: '800' }}>
                                {weekWellnessStats.emotionLabel}
                            </Text>
                        </View>
                    </View>
                    <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 14 }}>
                        Weekly trend
                    </Text>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 32, fontWeight: '900', marginTop: 4 }}>
                        {`Mood trend: ${weekMoodMeta.label}`}
                    </Text>
                    <Text style={{ color: weekAverageMoodColor, fontSize: 15, fontWeight: '800', marginTop: 8, lineHeight: 20 }}>
                        {`Most common mood: ${weekWellnessStats.emotionLabel}`}
                    </Text>
                    {/* <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
                        {averageMoodPlainLine(displayWeekAvgMood)}
                    </Text> */}
                </Animatable.View>

                {totalCheckIns > 0 ? (
                    <ChartSection>
                        <AnalyticsMoodWidgets
                            logs={logs as (MoodData & { log_date: Date })[]}
                            resetHour={dayResetHour}
                            timezone={timezone}
                        />
                    </ChartSection>
                ) : null}
            </View>

            {celebrateMilestone ? (
                <Animatable.View
                    animation="fadeInDown"
                    duration={450}
                    style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: 'rgba(254, 189, 3, 0.14)',
                        borderWidth: 1,
                        borderColor: 'rgba(254, 189, 3, 0.35)',
                    }}
                >
                    <Text style={{ color: AURORA.amber, fontSize: 15, fontWeight: '800', textAlign: 'center' }}>
                        Nice milestone — keep caring for yourself!
                    </Text>
                </Animatable.View>
            ) : null}
     

            <View
                style={{
                    backgroundColor: 'rgba(22, 34, 92, 0.8)',
                    padding: 18,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: 'rgba(91, 117, 255, 0.32)',
                    shadowColor: '#5B75FF',
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 5,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {aiLoading && !reduceMotion ? (
                        <Animatable.View animation="pulse" iterationCount="infinite" duration={1400}>
                            <Sparkles size={24} color={AURORA.blue} />
                        </Animatable.View>
                    ) : (
                        <Sparkles size={24} color={AURORA.blue} />
                    )}
                    <Text style={{ color: AURORA.textPrimary, fontSize: 18, fontWeight: '800', flex: 1 }}>
                        Written summary for the last 7 days
                    </Text>
                </View>
                <View style={{ marginBottom: 10 }}>
                    <EthicsLine />
                </View>

                {weekSummaryGenerating ? (
                    <Text
                        style={{
                            color: AURORA.textMuted,
                            fontSize: 12,
                            marginBottom: 10,
                            lineHeight: 17,
                            fontStyle: 'italic',
                        }}
                    >
                        Generating your summary…
                    </Text>
                ) : null}
                {/* {!weekSummaryGenerating && weekSummaryTemplate ? (
                    <Text style={{ color: AURORA.textMuted, fontSize: 11, marginBottom: 10 }}>
                        Weekly summary source: {weekSummarySource === 'ai' ? 'AI' : 'fallback template'}
                    </Text>
                ) : null} */}
                {aiLoading ? (
                    <AISummarySkeleton reduceMotion={reduceMotion} />
                ) : weeklyAi ? (
                    <>
                        <View style={{ marginBottom: 14, gap: 6 }}>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, lineHeight: 20 }}>
                                Stress: <Text style={{ color: UI_TEXT_SECONDARY }}>{sentenceCase(stressLabelFriendly)}</Text>
                            </Text>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, lineHeight: 20 }}>
                                Energy: <Text style={{ color: UI_TEXT_SECONDARY }}>{sentenceCase(weekWellnessStats.energyLabel)}</Text>
                            </Text>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, lineHeight: 20 }}>
                                Sleep: <Text style={{ color: UI_TEXT_SECONDARY }}>{sentenceCase(weekWellnessStats.sleepLabel)}</Text>
                            </Text>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, lineHeight: 20 }}>
                                Mood stability: <Text style={{ color: UI_TEXT_SECONDARY }}>{weekWellnessStats.stability != null ? `${weekWellnessStats.stability}%` : 'not enough data'}</Text>
                            </Text>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, lineHeight: 22, marginTop: 6 }}>
                                Academic pattern: <Text style={{ color: UI_TEXT_SECONDARY }}>{weekSchoolAnalysis?.summary ?? 'No school-tagged check-ins in the last 7 days.'}</Text>
                            </Text>
                        </View>
                        {weekSchoolAnalysis?.topSchoolEvents?.length ? (
                            <View
                                style={{
                                    marginTop: 2,
                                    marginBottom: 10,
                                    padding: 10,
                                    borderRadius: 12,
                                    backgroundColor: 'rgba(45, 107, 255, 0.10)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(45, 107, 255, 0.24)',
                                    gap: 6,
                                }}
                            >
                                <Text style={{ color: AURORA.textPrimary, fontSize: 10, fontWeight: '700' }}>
                                    TOP ACADEMIC STRESSORS
                                </Text>
                                <Text style={{ color: UI_TEXT_MUTED, fontSize: 10, lineHeight: 14, marginTop: -1, marginBottom: 2 }}>
                                    Counts from tagged check-ins this week.
                                </Text>
                                {weekSchoolAnalysis.topSchoolEvents.map((item) => {
                                    const maxCount = Math.max(1, weekSchoolAnalysis.topSchoolEvents[0]?.count ?? 1);
                                    const widthPct = Math.max(18, Math.round((item.count / maxCount) * 100));
                                    return (
                                        <View key={`weekly-summary-school-${item.label}`}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                                <Text style={{ color: AURORA.green, fontSize: 11, fontWeight: '700' }}>{item.label}</Text>
                                                <Text style={{ color: AURORA.green, fontSize: 11, fontWeight: '700' }}>{item.count}</Text>
                                            </View>
                                            <View style={{ height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                                <View
                                                    style={{
                                                        width: `${widthPct}%`,
                                                        height: 7,
                                                        borderRadius: 999,
                                                        backgroundColor: AURORA.blue,
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : null}
                        {weeklyAi.support_note ? (
                            <Text style={{ color: AURORA.amber, fontSize: 14, marginTop: 14, lineHeight: 21 }}>
                                {weeklyAi.support_note}
                            </Text>
                        ) : null}
                    </>
                ) : (
                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>Summary will show after your data loads.</Text>
                )}

            </View>

                </View>
            ) : null}
        </ScrollView>
    );
}
