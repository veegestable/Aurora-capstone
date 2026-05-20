import { AppText as Text } from "./common/AppText";
/**
 * Student "Your week" analytics — ethics-first copy, consistent Mood / Stress Index terms,
 * stagger + count-up animations (respects Reduce Motion).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"; import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  AppState,
  Platform,
  Image,
  type AppStateStatus,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Animatable from "react-native-animatable";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  Sparkles,
  TrendingUp,
  CircleHelp,
  PieChart,
  Clock3,
  BarChart3,
  Tags,
} from "lucide-react-native";
import { useAuth } from "../stores/AuthContext";
import { moodService } from "../services/mood.service";
import { auth } from "../services/firebase";
import {
  buildPeriodSummaryInput,
  generateWeeklySummary,
} from "../services/weeklySummaryGenerate.service";
import type { MoodData } from "../services/firebase-firestore.service";
import {
  fetchWeeklyAiAnalyticsWithPayload,
  deterministicWeeklyFallback,
  type WeeklyAiResult,
} from "../services/weeklyAnalyticsAi.service";
import { buildLast7DaysPayload } from "../utils/analytics/weeklySeries";
import {
  calculateCheckInStreak,
  calculateHighestCheckInStreakInWindow,
} from "../utils/analytics/dateKeys";
import { calendarDayKeyLocal } from "../utils/dayKey";
import { moodLogsToMoodEntries } from "../utils/moodEntryNormalize";
import { subscribeMoodLogsRefresh } from "../utils/moodLogsRefresh";
import {
  aggregateByDay,
  aggregateByHour,
  moodStabilityScore,
} from "../utils/moodAggregates";
import { blendColors } from "../utils/blendColors";
import {
  MoodDistributionDonut,
  ETHICS_ANALYTICS_FOOTER,
} from "./analytics/DescriptiveCharts";
import { AnalyticsMoodWidgets } from "./analytics/AnalyticsMoodWidgets";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useCountUp } from "../hooks/useCountUp";
import { AURORA } from "../constants/aurora-colors";
import { InfoGuideModal, type InfoGuideContent } from "./common/InfoGuideModal";
import {
  canonicalMoodKey,
  getEmotionColor,
  getEmotionLabel,
} from "../utils/moodColors";
import { getMoodIconSource } from "../utils/moodIconAssets";
import {
  stressCategoryFromFive,
  energyCategoryFromFive,
  sentenceCase,
} from "../utils/analytics/metricCategories";

const STREAK_MILESTONES = [3, 7, 14, 30];
const ANALYTICS_VIEW_TOGGLE_PAD = 4;
const UI_TEXT_SECONDARY = "#C1CEE9";
const UI_TEXT_MUTED = "#9AA9C8";
const UI_SECTION_GAP = 12;

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; message?: unknown };
  const code = typeof maybe.code === "string" ? maybe.code.toLowerCase() : "";
  const message =
    typeof maybe.message === "string" ? maybe.message.toLowerCase() : "";
  return code.includes("permission-denied") ||
    code.includes("permission_denied")
    ? true
    : message.includes("missing or insufficient permissions");
}

/**
 * Android: animated children inside ScrollView often flicker when the scroll view
 * aggressively clips off-screen subtrees. `collapsable={false}` keeps the wrapper
 * in the native hierarchy.
 *
 * Panel motion is centralized in `AnalyticsPanel`: Android uses a short
 * **translateY-only** slide (opacity stays 1) to avoid compositor bugs from
 * fading large subtrees; iOS keeps `fadeInUp`.
 */
const ANDROID_ANIMATABLE_STABILITY =
  Platform.OS === "android" ? ({ collapsable: false } as const) : {};

type AnalyticsPanelProps = {
  reduceMotion: boolean;
  delayMs: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** iOS `fadeInUp` duration (default 420). */
  iosFadeDuration?: number;
};

/**
 * Cross-platform panel entrance: iOS = fadeInUp; Android = subtle slide-up
 * (transform only, native driver); reduce motion = plain View.
 */
function AnalyticsPanel({
  reduceMotion,
  delayMs,
  children,
  style,
  iosFadeDuration = 420,
}: AnalyticsPanelProps) {
  const translateY = useSharedValue(
    !reduceMotion && Platform.OS === "android" ? 10 : 0,
  );

  useEffect(() => {
    if (reduceMotion) {
      translateY.value = 0;
      return;
    }
    if (Platform.OS === "android") {
      translateY.value = 10;
      const t = setTimeout(() => {
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      }, delayMs);
      return () => clearTimeout(t);
    }
    translateY.value = 0;
  }, [delayMs, reduceMotion, translateY]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }
  if (Platform.OS === "android") {
    return (
      <Animated.View
        {...ANDROID_ANIMATABLE_STABILITY}
        style={[style, slideStyle]}
      >
        {children}
      </Animated.View>
    );
  }
  return (
    <Animatable.View
      {...ANDROID_ANIMATABLE_STABILITY}
      animation="fadeInUp"
      duration={iosFadeDuration}
      delay={delayMs}
      useNativeDriver
      style={style}
    >
      {children}
    </Animatable.View>
  );
}
const SCHOOL_EVENT_TAGS = new Set([
  "classes",
  "study",
  "quiz",
  "exam",
  "homework",
  "deadline",
  "group-project",
  "presentation",
]);

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dominantMoodAccentColor(label: string, fallback: string): string {
  const key = label.toLowerCase().trim();
  if (key === "happy" || key === "happiness" || key === "joy")
    return AURORA.moodHappy;
  if (key === "sad" || key === "sadness") return AURORA.moodSad;
  if (key === "angry" || key === "anger") return AURORA.moodAngry;
  if (key === "neutral") return AURORA.moodNeutral;
  if (key === "surprise" || key === "surprised") return AURORA.moodSurprise;
  return fallback;
}

/** Descriptive mood band from a 1–5 average (period-agnostic copy). */
function periodMoodTone(avgMood: number | null): {
  label: string;
  color: string;
} {
  if (avgMood == null)
    return { label: "Not enough check-ins", color: AURORA.blue };
  if (avgMood >= 4.2) return { label: "Mostly good", color: AURORA.moodHappy };
  if (avgMood >= 3.4)
    return { label: "Mostly okay", color: AURORA.moodNeutral };
  if (avgMood >= 2.6)
    return { label: "Ups and downs", color: AURORA.moodSurprise };
  return { label: "Mostly low", color: AURORA.moodSad };
}

function normalizeEmotionBucket(
  raw: string,
): "happy" | "angry" | "surprise" | "neutral" | "sad" | "" {
  const e = raw.toLowerCase().trim();
  if (!e) return "";
  if (e === "happy" || e === "happiness" || e === "happy") return "happy";
  if (e === "anger" || e === "angry") return "angry";
  if (e === "surprised" || e === "surprise") return "surprise";
  if (e === "sadness" || e === "sad") return "sad";
  if (e === "neutral") return "neutral";
  return "";
}

function moodIconForLabel(raw: string): ImageSourcePropType {
  return getMoodIconSource(raw);
}

const EMOTION_BUCKET_TO_CANONICAL_MOOD: Record<
  "happy" | "angry" | "surprise" | "neutral" | "sad",
  string
> = {
  happy: "joy",
  angry: "anger",
  surprise: "surprise",
  neutral: "neutral",
  sad: "sadness",
};

function formatEmotionBucketLabel(bucket: string): string {
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

function totalMinutesForEmotionBucket(
  bucket: string,
  byMood: Array<{ mood: string; totalMinutes: number }>,
): number {
  const canonical =
    EMOTION_BUCKET_TO_CANONICAL_MOOD[
      bucket as keyof typeof EMOTION_BUCKET_TO_CANONICAL_MOOD
    ] ?? canonicalMoodKey(bucket);
  const row = byMood.find((x) => x.mood === canonical);
  return row?.totalMinutes ?? 0;
}

/** Pick mood with highest check-in count; ties broken by total logged duration. */
function pickDominantMoodChartRow(
  byMood: Array<{ mood: string; label: string; count: number; totalMinutes: number }>,
): { mood: string; label: string } | null {
  const withCheckIns = byMood.filter((x) => x.count > 0);
  if (withCheckIns.length === 0) return null;
  const maxCount = Math.max(...withCheckIns.map((x) => x.count));
  const tied = withCheckIns.filter((x) => x.count === maxCount);
  return tied.sort(
    (a, b) =>
      b.totalMinutes - a.totalMinutes || a.mood.localeCompare(b.mood),
  )[0];
}

/** Most frequent primary emotion (`emotions[0]`); count ties use logged duration. */
function dominantEmotionLabelFromLogs(
  inputLogs: Array<
    MoodData & { emotions?: Array<{ emotion?: string }> }
  >,
  moodCharts: { byMood: Array<{ mood: string; totalMinutes: number }> },
): string | null {
  const emotionCount = new Map<string, number>();
  for (const log of inputLogs) {
    const primaryEmotion = Array.isArray(log.emotions)
      ? normalizeEmotionBucket(log.emotions[0]?.emotion || "")
      : "";
    if (primaryEmotion.length > 0) {
      emotionCount.set(
        primaryEmotion,
        (emotionCount.get(primaryEmotion) ?? 0) + 1,
      );
    }
  }
  if (emotionCount.size === 0) return null;

  const maxCount = Math.max(...emotionCount.values());
  const tied = [...emotionCount.entries()].filter(([, c]) => c === maxCount);
  const dominant = tied.sort((a, b) => {
    const durationDiff =
      totalMinutesForEmotionBucket(b[0], moodCharts.byMood) -
      totalMinutesForEmotionBucket(a[0], moodCharts.byMood);
    if (durationDiff !== 0) return durationDiff;
    return a[0].localeCompare(b[0]);
  })[0][0];

  return formatEmotionBucketLabel(dominant);
}

function dominantMoodDisplayFromLogs(
  inputLogs: Array<
    MoodData & {
      log_date: Date;
      emotions?: Array<{ emotion?: string }>;
      mood?: string;
    }
  >,
  moodCharts: {
    byMood: Array<{
      mood: string;
      label: string;
      count: number;
      totalMinutes: number;
    }>;
  },
): { label: string; icon: ImageSourcePropType | null } {
  if (inputLogs.length === 0) {
    return { label: "Not enough check-ins", icon: null };
  }
  const fromEmotion = dominantEmotionLabelFromLogs(inputLogs, moodCharts);
  if (fromEmotion) {
    return {
      label: fromEmotion,
      icon: moodIconForLabel(fromEmotion),
    };
  }
  const top = pickDominantMoodChartRow(moodCharts.byMood);
  if (!top) return { label: "Not enough data", icon: null };
  return {
    label: top.label,
    icon: moodIconForLabel(top.label || top.mood),
  };
}

type MoodChartAggregate = {
  mood: string;
  label: string;
  color: string;
  count: number;
  totalMinutes: number;
  averageIntensity: number;
  intensitySamples: number;
};

type MoodEpisode = {
  startMs: number;
  endMs: number;
};

function getMoodFromLog(
  log: MoodData & { mood?: string; emotions?: Array<{ emotion?: string }> },
): string {
  const raw = log.mood || log.emotions?.[0]?.emotion || "neutral";
  return canonicalMoodKey(String(raw));
}

function getIntensityFromLog(log: MoodData): number | null {
  const raw = typeof log.intensity === "number" ? log.intensity : null;
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

function getDurationMinutesFromLog(log: MoodData): number | null {
  const raw =
    typeof log.duration_in_minutes === "number"
      ? log.duration_in_minutes
      : null;
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.max(1, Math.min(1440, Math.round(raw)));
}

function localDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

type AnalyticsViewKey = "today" | "week" | "last30";

function periodDayCountForView(view: AnalyticsViewKey): 7 | 30 | null {
  if (view === "week") return 7;
  if (view === "last30") return 30;
  return null;
}

function buildRollingDayKeySet(dayCount: number): Set<string> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const keySet = new Set<string>();
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keySet.add(calendarDayKeyLocal(d));
  }
  return keySet;
}

function mergeEpisodes(episodes: MoodEpisode[]): MoodEpisode[] {
  if (episodes.length <= 1) return episodes;
  const sorted = [...episodes].sort((a, b) => a.startMs - b.startMs);
  const merged: MoodEpisode[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = merged[merged.length - 1];
    if (current.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, current.endMs);
      continue;
    }
    merged.push({ ...current });
  }
  return merged;
}

function buildMoodCharts(
  inputLogs: Array<MoodData & { log_date: Date }>,
  rangeStartMs: number,
  rangeEndMs: number,
): {
  byMood: MoodChartAggregate[];
  totalCheckIns: number;
} {
  if (inputLogs.length === 0) {
    return {
      byMood: [],
      totalCheckIns: 0,
    };
  }

  const moodCount = new Map<string, number>();
  const moodIntensity = new Map<string, { sum: number; n: number }>();
  const moodEpisodes = new Map<string, MoodEpisode[]>();

  for (const log of inputLogs) {
    const moodKey = getMoodFromLog(log);
    moodCount.set(moodKey, (moodCount.get(moodKey) ?? 0) + 1);

    const intensity = getIntensityFromLog(log);
    if (intensity != null) {
      const prev = moodIntensity.get(moodKey) ?? { sum: 0, n: 0 };
      moodIntensity.set(moodKey, { sum: prev.sum + intensity, n: prev.n + 1 });
    }

    const minutes = getDurationMinutesFromLog(log);
    if (minutes != null) {
      const endMs = new Date(log.log_date).getTime();
      const startMs = endMs - minutes * 60 * 1000;
      const clippedStart = Math.max(startMs, rangeStartMs);
      const clippedEnd = Math.min(endMs, rangeEndMs);
      if (clippedEnd > clippedStart) {
        const list = moodEpisodes.get(moodKey) ?? [];
        list.push({ startMs: clippedStart, endMs: clippedEnd });
        moodEpisodes.set(moodKey, list);
      }
    }
  }

  const moodKeys = Array.from(
    new Set([
      ...moodCount.keys(),
      ...moodIntensity.keys(),
      ...moodEpisodes.keys(),
    ]),
  );
  const byMood = moodKeys
    .map((mood) => {
      const episodes = mergeEpisodes(moodEpisodes.get(mood) ?? []);
      const totalMinutes = episodes.reduce(
        (sum, e) =>
          sum + Math.max(0, Math.round((e.endMs - e.startMs) / 60000)),
        0,
      );
      const intensityStats = moodIntensity.get(mood) ?? { sum: 0, n: 0 };
      const averageIntensity =
        intensityStats.n > 0 ? intensityStats.sum / intensityStats.n : 0;
      return {
        mood,
        label: getEmotionLabel(mood),
        color: getEmotionColor(mood),
        count: moodCount.get(mood) ?? 0,
        totalMinutes,
        averageIntensity,
        intensitySamples: intensityStats.n,
      };
    })
    .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);

  return {
    byMood,
    totalCheckIns: inputLogs.length,
  };
}

type SchoolAnalysis = {
  totalSchoolEvents: number;
  schoolCheckIns: number;
  loadBand: string;
  topSchoolEvents: Array<{ label: string; count: number }>;
};

function schoolLoadBandFromTagCount(totalSchoolEvents: number): string {
  if (totalSchoolEvents === 0) return "Light workload";
  if (totalSchoolEvents <= 3) return "Balanced load";
  if (totalSchoolEvents <= 6) return "Busy load";
  return "Heavy load";
}

function schoolLoadBandColor(loadBand: string): string {
  if (loadBand.includes("Light")) return AURORA.moodHappy;
  if (loadBand.includes("Balanced")) return "#F59E0B";
  if (loadBand.includes("Busy")) return AURORA.moodSurprise;
  if (loadBand.includes("Heavy")) return AURORA.moodAngry;
  return AURORA.blue;
}

type TodayEventInsight = {
  topCategory: string;
  topCategoryCount: number;
  topEvents: Array<{ label: string; count: number }>;
  categoryBreakdown: Array<{ label: string; count: number }>;
  totalTaggedCheckIns: number;
  summary: string;
};

function toFiveScale(value: unknown, fallback = 3): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 5) return Math.max(1, Math.min(5, n));
  return Math.max(1, Math.min(5, Math.round(n / 2)));
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function analyzeTodayEvents(
  inputLogs: Array<
    MoodData & {
      log_date: Date;
      event_tags?: string[];
      event_categories?: string[];
    }
  >,
): TodayEventInsight | null {
  if (!inputLogs.length) return null;

  const categoryCount = new Map<string, number>();
  const eventCount = new Map<string, number>();
  let totalTaggedCheckIns = 0;

  for (const log of inputLogs) {
    const categories = Array.isArray(log.event_categories)
      ? log.event_categories.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        )
      : [];
    const events = Array.isArray(log.event_tags)
      ? log.event_tags.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        )
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

  const topCategoryEntry = [...categoryCount.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const categoryBreakdown = [...categoryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ label: humanizeLabel(category), count }));
  const topEvents = [...eventCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ label: humanizeLabel(tag), count }));

  if (!topCategoryEntry && topEvents.length === 0) return null;

  const topCategory = topCategoryEntry
    ? humanizeLabel(topCategoryEntry[0])
    : "General";
  const topCategoryCount = topCategoryEntry?.[1] ?? 0;
  const summary = topCategoryEntry
    ? `Most of your tagged check-ins today are in ${topCategory} (${topCategoryCount}).`
    : "Your check-ins today include event tags, but no single category was dominant.";

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
    }
  >,
): SchoolAnalysis | null {
  const schoolLogs = inputLogs.filter((l) => {
    const tags = Array.isArray(l.event_tags) ? l.event_tags : [];
    return tags.some((t) => SCHOOL_EVENT_TAGS.has(t));
  });
  if (!schoolLogs.length) return null;

  const eventCount = new Map<string, number>();
  let totalSchoolEvents = 0;

  for (const log of schoolLogs) {
    const tags = (Array.isArray(log.event_tags) ? log.event_tags : []).filter(
      (t) => SCHOOL_EVENT_TAGS.has(t),
    );
    totalSchoolEvents += tags.length;
    for (const tag of tags) eventCount.set(tag, (eventCount.get(tag) ?? 0) + 1);
  }

  const topSchoolEvents = [...eventCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ label: humanizeLabel(tag), count }));

  return {
    totalSchoolEvents,
    schoolCheckIns: schoolLogs.length,
    loadBand: schoolLoadBandFromTagCount(totalSchoolEvents),
    topSchoolEvents,
  };
}

function buildAcademicAnalyticsGuideBody(timeWindow: string): string {
  return [
    `Academic analytics uses check-ins tagged with school activities (classes, study, exams, homework, etc.) ${timeWindow}.`,
    "",
    'Labels like "Balanced load" come from how many school tags you logged:',
    "• 0 tags — Light workload",
    "• 1–3 tags — Balanced load",
    "• 4–6 tags — Busy load",
    "• 7+ tags — Heavy load",
    "",
    "Each tag counts separately, even on the same check-in.",
  ].join("\n");
}

function EthicsLine() {
  return (
    <Text
      style={{
        color: UI_TEXT_MUTED,
        fontSize: 11,
        lineHeight: 16,
        fontStyle: "italic",
      }}
    >
      {ETHICS_ANALYTICS_FOOTER}
    </Text>
  );
}

function TodayFocusMetricRow({
  label,
  count,
  maxCount,
  barColor = AURORA.purple,
}: {
  label: string;
  count: number;
  maxCount: number;
  barColor?: string;
}) {
  const widthPct = Math.max(
    18,
    Math.round((count / Math.max(1, maxCount)) * 100),
  );
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text
          style={{
            color: AURORA.textMuted,
            fontSize: 11,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: AURORA.textMuted,
            fontSize: 11,
            fontWeight: "700",
          }}
        >
          {count}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.09)",
        }}
      >
        <View
          style={{
            width: `${widthPct}%`,
            height: 8,
            borderRadius: 999,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}

type TodayHourlyTrendBar = {
  key: string;
  hour: number;
  stress: number | null;
  energy: number | null;
};

const TODAY_HOURLY_BAR_WIDTH = 14;
const TODAY_HOURLY_BAR_GAP = 4;

function TodayHourlyMetricChart({
  bars,
  metric,
  barColor,
}: {
  bars: TodayHourlyTrendBar[];
  metric: "stress" | "energy";
  barColor: string;
}) {
  const chartWidth = bars.length * (TODAY_HOURLY_BAR_WIDTH + TODAY_HOURLY_BAR_GAP);

  const valueFor = (bar: TodayHourlyTrendBar) =>
    metric === "stress" ? bar.stress : bar.energy;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width: Math.max(360, chartWidth) }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View
              style={{
                height: 120,
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingTop: 2,
                paddingBottom: 2,
              }}
            >
              {[5, 4, 3, 2, 1].map((tick) => (
                <Text
                  key={`${metric}-y-${tick}`}
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 9,
                    width: 12,
                    textAlign: "right",
                  }}
                >
                  {tick}
                </Text>
              ))}
            </View>
            <View>
              {[1, 2, 3, 4, 5].map((tick) => (
                <View
                  key={`${metric}-grid-${tick}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: ((5 - tick) / 4) * 112 + 4,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.09)",
                  }}
                />
              ))}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  height: 120,
                  gap: TODAY_HOURLY_BAR_GAP,
                }}
              >
                {bars.map((item) => {
                  const value = valueFor(item);
                  const hasData = value != null;
                  const barHeight = hasData
                    ? Math.max(8, (value! / 5) * 104)
                    : 8;
                  return (
                    <View
                      key={`${metric}-${item.key}`}
                      style={{
                        width: TODAY_HOURLY_BAR_WIDTH,
                        height: 120,
                        justifyContent: "flex-end",
                      }}
                    >
                      <View
                        style={{
                          width: TODAY_HOURLY_BAR_WIDTH,
                          height: barHeight,
                          borderRadius: 4,
                          backgroundColor: hasData
                            ? barColor
                            : "rgba(148,163,184,0.35)",
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: TODAY_HOURLY_BAR_GAP,
              marginTop: 6,
              marginLeft: 20,
            }}
          >
            {bars.map((item) => (
              <Text
                key={`${metric}-label-${item.key}`}
                style={{
                  width: TODAY_HOURLY_BAR_WIDTH,
                  color: AURORA.textMuted,
                  fontSize: 7,
                  textAlign: "center",
                }}
              >
                {item.hour}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <Text
        style={{
          color: AURORA.textMuted,
          fontSize: 10,
          marginTop: 6,
          marginLeft: 20,
        }}
      >
        Unit: hour 
      </Text>
    </View>
  );
}

/** Shimmer row — Reanimated only (avoids moti → popmotion → broken framesync in Metro). */
function SkeletonLine({
  index,
  reduceMotion,
}: {
  index: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0.42);
  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.55;
      return;
    }
    if (Platform.OS === "android") {
      opacity.value = 0.52;
      return;
    }
    const start = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.74, {
            duration: 880,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.34, {
            duration: 880,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    }, index * 90);
    return () => clearTimeout(start);
  }, [index, reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      {...ANDROID_ANIMATABLE_STABILITY}
      style={[
        {
          height: 13,
          width: "100%",
          maxWidth: index === 3 ? 260 : undefined,
          alignSelf: "stretch",
          borderRadius: 8,
          backgroundColor: "rgba(255,255,255,0.08)",
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
    if (Platform.OS === "android") {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const content = (
    <>
      <Text style={{ fontSize: 44 }}>🌿</Text>
      <Text
        style={{
          color: AURORA.textSec,
          fontSize: 14,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Start logging to see your week come to life.
      </Text>
    </>
  );
  if (Platform.OS === "android") {
    return (
      <View
        style={{ alignItems: "center", paddingVertical: 24, marginBottom: 8 }}
      >
        {content}
      </View>
    );
  }
  return (
    <Animated.View
      {...ANDROID_ANIMATABLE_STABILITY}
      style={[
        { alignItems: "center", paddingVertical: 24, marginBottom: 8 },
        style,
      ]}
    >
      {content}
    </Animated.View>
  );
}

function ChartSection({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        // backgroundColor: AURORA.card,
        // borderRadius: 20,
        // padding: 16,
        marginBottom: 16,
        // borderWidth: 1,
        // borderColor: AURORA.border,
      }}
    >
      {children}
    </View>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [weekSummaryGenerating, setWeekSummaryGenerating] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<AnalyticsViewKey>("today");
  /** Measured relative to the inner row (thumb uses same coords + outer horizontal padding). */
  const [analyticsViewSegments, setAnalyticsViewSegments] = useState<{
    today: { x: number; w: number };
    week: { x: number; w: number };
    last30: { x: number; w: number };
  }>({
    today: { x: 0, w: 0 },
    week: { x: 0, w: 0 },
    last30: { x: 0, w: 0 },
  });
  const [periodWrittenSummary, setPeriodWrittenSummary] = useState("");
  const [activeWeekPill, setActiveWeekPill] = useState<
    "days" | "checkins" | "streak" | null
  >(null);
  const [activeGuide, setActiveGuide] = useState<InfoGuideContent | null>(null);
  const [selectedTodayMood, setSelectedTodayMood] = useState<string | null>(
    null,
  );
  const [selectedWeekMood, setSelectedWeekMood] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    (MoodData & { log_date: Date; id?: string })[]
  >([]);
  const [_lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [weeklyAi, setWeeklyAi] = useState<WeeklyAiResult | null>(null);
  const [celebrateMilestone, setCelebrateMilestone] = useState(false);
  const prevStreakRef = useRef<number | null>(null);
  const isRefreshingLogsRef = useRef(false);
  const latestLogsRef = useRef<(MoodData & { log_date: Date; id?: string })[]>(
    [],
  );

  const analyticsViewThumbX = useSharedValue(0);
  const analyticsViewThumbW = useSharedValue(0);
  const analyticsViewThumbStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: ANALYTICS_VIEW_TOGGLE_PAD,
    bottom: ANALYTICS_VIEW_TOGGLE_PAD,
    left: ANALYTICS_VIEW_TOGGLE_PAD,
    width: analyticsViewThumbW.value,
    transform: [{ translateX: analyticsViewThumbX.value }],
    backgroundColor: AURORA.purple,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  }));

  useEffect(() => {
    latestLogsRef.current = logs;
  }, [logs]);

  const onAnalyticsViewSegmentLayout = useCallback(
    (key: AnalyticsViewKey, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setAnalyticsViewSegments((prev) => {
        const next = { ...prev, [key]: { x, w: width } };
        if (prev[key].x === next[key].x && prev[key].w === next[key].w)
          return prev;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const seg =
      analyticsView === "today"
        ? analyticsViewSegments.today
        : analyticsView === "week"
          ? analyticsViewSegments.week
          : analyticsViewSegments.last30;
    if (seg.w <= 0) return;
    const dur = reduceMotion ? 0 : 240;
    const easing = Easing.out(Easing.cubic);
    if (reduceMotion) {
      analyticsViewThumbX.value = seg.x;
      analyticsViewThumbW.value = seg.w;
      return;
    }
    /*
     * Android: animating `width` on a child of `overflow: "hidden"` + elevation
     * often produces visible flicker. Snap width to layout; only slide on X.
     */
    if (Platform.OS === "android") {
      analyticsViewThumbW.value = seg.w;
      analyticsViewThumbX.value = withTiming(seg.x, { duration: dur, easing });
    } else {
      analyticsViewThumbW.value = withTiming(seg.w, { duration: dur, easing });
      analyticsViewThumbX.value = withTiming(seg.x, { duration: dur, easing });
    }
  }, [analyticsView, analyticsViewSegments, reduceMotion, analyticsViewThumbW, analyticsViewThumbX]);

  const refreshMoodLogs = useCallback(
    async (opts?: {
      setBusyState?: boolean;
    }): Promise<(MoodData & { log_date: Date })[]> => {
      if (!user) return [];
      if (isRefreshingLogsRef.current)
        return latestLogsRef.current as (MoodData & { log_date: Date })[];

      const shouldSetBusyState = opts?.setBusyState ?? false;
      if (shouldSetBusyState) setRefreshing(true);
      isRefreshingLogsRef.current = true;

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 45);
        const moodLogs = await moodService.getMoodLogs(
          user.id,
          startDate.toISOString(),
          endDate.toISOString(),
        );
        const list = (moodLogs || []) as (MoodData & { log_date: Date })[];
        setLogs(list);
        setLastUpdatedAt(new Date());
        return list;
      } catch (e) {
        const signedOutOrSwitchedUser =
          !auth.currentUser || auth.currentUser.uid !== user.id;
        const shouldSuppress =
          signedOutOrSwitchedUser && isPermissionDeniedError(e);
        if (!shouldSuppress) {
          console.error("Analytics logs refresh failed", e);
        }
        if (shouldSetBusyState) setLogs([]);
        return [];
      } finally {
        isRefreshingLogsRef.current = false;
        if (shouldSetBusyState) setRefreshing(false);
      }
    },
    [user],
  );

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await refreshMoodLogs();
      setLoading(false);
      setRefreshing(false);

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
      console.error("Analytics load failed", e);
      setLogs([]);
      setWeeklyAi(null);
      setLoading(false);
      setRefreshing(false);
      setAiLoading(false);
      setWeekSummaryGenerating(false);
    }
  }, [user, refreshMoodLogs]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      load();
    }
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    return subscribeMoodLogsRefresh(() => {
      void load();
    });
  }, [user, load]);

  useEffect(() => {
    setActiveWeekPill(null);
    setSelectedWeekMood(null);
  }, [analyticsView]);

  const streak = useMemo(
    () => calculateCheckInStreak(logs as { log_date: Date }[], new Date()),
    [logs],
  );

  const periodDays = periodDayCountForView(analyticsView);
  const periodHighestStreak = useMemo(() => {
    if (!periodDays) return 0;
    return calculateHighestCheckInStreakInWindow(
      logs as { log_date: Date }[],
      periodDays,
      new Date(),
    );
  }, [logs, periodDays]);
  const periodDayKeySet = useMemo(() => {
    if (!periodDays) return new Set<string>();
    return buildRollingDayKeySet(periodDays);
  }, [periodDays]);

  const periodDaysLogged = useMemo(() => {
    if (!periodDays) return 0;
    const keysWithData = new Set<string>();
    for (const log of logs) {
      const dk = calendarDayKeyLocal(new Date(log.log_date));
      if (periodDayKeySet.has(dk)) keysWithData.add(dk);
    }
    return keysWithData.size;
  }, [logs, periodDayKeySet, periodDays]);

  /** One mood score per logged day in the window, then averaged (7- or 30-day). */
  const periodAvgMood = useMemo(() => {
    if (!periodDays) return null;
    const entries = moodLogsToMoodEntries(
      logs as (MoodData & { log_date: Date })[],
    ).filter((e) => e.dayKey && periodDayKeySet.has(e.dayKey));
    const dayScores: number[] = [];
    for (const dk of periodDayKeySet) {
      const agg = aggregateByDay(entries, dk);
      if (agg.entryCount > 0) {
        dayScores.push(
          Math.min(5, Math.max(1, Math.round(agg.avgIntensity / 2))),
        );
      }
    }
    if (dayScores.length === 0) return null;
    return dayScores.reduce((a, b) => a + b, 0) / dayScores.length;
  }, [logs, periodDayKeySet, periodDays]);

  useEffect(() => {
    if (!periodDays) {
      setPeriodWrittenSummary("");
      return;
    }
    let cancelled = false;
    (async () => {
      setWeekSummaryGenerating(true);
      try {
        const label =
          periodDays === 30 ? "the last 30 days" : "the last 7 days";
        const input = buildPeriodSummaryInput(
          logs as (MoodData & { log_date: Date })[],
          periodDays,
          label,
        );
        const summary = await generateWeeklySummary(input);
        if (!cancelled) setPeriodWrittenSummary(summary.summary);
      } catch {
        if (!cancelled) setPeriodWrittenSummary("");
      } finally {
        if (!cancelled) setWeekSummaryGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [periodDays, logs]);

  const todayMoodAgg = useMemo(() => {
    const dk = calendarDayKeyLocal(new Date());
    const entries = moodLogsToMoodEntries(
      logs as (MoodData & { log_date: Date })[],
    );
    return aggregateByDay(entries, dk);
  }, [logs]);

  const todayEntries = useMemo(() => {
    const dk = calendarDayKeyLocal(new Date());
    const entries = moodLogsToMoodEntries(
      logs as (MoodData & { log_date: Date })[],
    );
    return entries.filter((e) => e.dayKey === dk);
  }, [logs]);

  const todayHourly = useMemo(
    () => aggregateByHour(todayEntries),
    [todayEntries],
  );

  const todayMetricBars = useMemo(() => {
    const byHour = new Map<number, { stress: number; energy: number }>();
    for (const h of todayHourly) {
      byHour.set(h.hour, {
        stress: h.avgStress,
        energy: h.avgEnergy,
      });
    }
    return Array.from({ length: 24 }, (_, hour) => {
      const point = byHour.get(hour);
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}h`,
        stress: point?.stress ?? null,
        energy: point?.energy ?? null,
      };
    });
  }, [todayHourly]);

  /** Always 24 hourly slots; unlocks after 2+ check-ins today. */
  const todayStressEnergyTrend = useMemo(() => {
    const checkInCount = todayEntries.length;
    const bars = todayMetricBars.map((item) => ({
      key: `hour-${item.hour}`,
      hour: item.hour,
      stress: item.stress,
      energy: item.energy,
    }));
    return {
      canShow: checkInCount >= 2,
      showStressChart:
        checkInCount >= 2 && bars.some((b) => b.stress != null),
      showEnergyChart:
        checkInCount >= 2 && bars.some((b) => b.energy != null),
      bars,
    };
  }, [todayEntries.length, todayMetricBars]);

  const todayBlended = useMemo(() => {
    if (!todayEntries.length) return AURORA.blue;
    return blendColors(
      todayEntries.map((e) => ({ color: e.color, intensity: e.intensity })),
    );
  }, [todayEntries]);

  const todayStability = useMemo(() => {
    const intensities = todayEntries.map((e) => e.intensity);
    return moodStabilityScore(intensities);
  }, [todayEntries]);

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
    if (!user || analyticsView !== "today") return;

    const intervalMs = 30_000;
    const intervalId = setInterval(() => {
      void refreshMoodLogs();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [user, analyticsView, refreshMoodLogs]);

  useEffect(() => {
    if (!user || analyticsView !== "today") return;

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        void refreshMoodLogs();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, [user, analyticsView, refreshMoodLogs]);

  const totalCheckIns = logs.length;
  const animPeriodHighestStreak = useCountUp(
    periodHighestStreak,
    640,
    true,
    reduceMotion,
  );
  const periodMoodMeta = useMemo(
    () => periodMoodTone(periodAvgMood),
    [periodAvgMood],
  );
  const todayDayLogs = useMemo(() => {
    const dk = calendarDayKeyLocal(new Date());
    return (
      logs as Array<
        MoodData & {
          log_date: Date;
          event_tags?: string[];
          event_categories?: string[];
        }
      >
    ).filter((l) => calendarDayKeyLocal(new Date(l.log_date)) === dk);
  }, [logs]);
  const todayMoodCharts = useMemo(() => {
    const now = new Date();
    const { start, end } = localDayBounds(now);
    return buildMoodCharts(todayDayLogs, start.getTime(), end.getTime());
  }, [todayDayLogs]);
  const todayDominantMoodDisplay = useMemo(
    () => dominantMoodDisplayFromLogs(todayDayLogs, todayMoodCharts),
    [todayDayLogs, todayMoodCharts],
  );
  const todayDominantMoodColor = useMemo(
    () =>
      dominantMoodAccentColor(todayDominantMoodDisplay.label, todayBlended),
    [todayDominantMoodDisplay.label, todayBlended],
  );
  const todayFrequencySegments = useMemo(
    () =>
      todayMoodCharts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? "" : "s"}`,
        })),
    [todayMoodCharts],
  );
  const todayDurationBars = useMemo(
    () =>
      [...todayMoodCharts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [todayMoodCharts],
  );
  const todayIntensityBars = useMemo(
    () =>
      [...todayMoodCharts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [todayMoodCharts],
  );
  const selectedMoodSummary = useMemo(() => {
    if (!selectedTodayMood) return null;
    return (
      todayMoodCharts.byMood.find((x) => x.mood === selectedTodayMood) ?? null
    );
  }, [selectedTodayMood, todayMoodCharts]);
  const todaySchoolAnalysis = useMemo(() => {
    return analyzeSchoolLogs(todayDayLogs as Parameters<typeof analyzeSchoolLogs>[0]);
  }, [todayDayLogs]);
  const todayEventInsight = useMemo(
    () => analyzeTodayEvents(todayDayLogs),
    [todayDayLogs],
  );
  const weekSchoolAnalysis = useMemo(() => {
    if (!periodDays) return null;
    const periodLogsForSchool = (
      logs as Array<
        MoodData & {
          log_date: Date;
          event_tags?: string[];
          event_categories?: string[];
        }
      >
    ).filter((l) =>
      periodDayKeySet.has(calendarDayKeyLocal(new Date(l.log_date))),
    );
    return analyzeSchoolLogs(periodLogsForSchool as Parameters<typeof analyzeSchoolLogs>[0]);
  }, [logs, periodDayKeySet, periodDays]);
  const periodLogs = useMemo(() => {
    if (!periodDays) return [];
    return (
      logs as Array<
        MoodData & {
          log_date: Date;
          sleep_quality?: "poor" | "fair" | "good";
          emotions?: Array<{ emotion?: string }>;
          stress_level?: number;
          energy_level?: number;
        }
      >
    ).filter((l) =>
      periodDayKeySet.has(calendarDayKeyLocal(new Date(l.log_date))),
    );
  }, [logs, periodDayKeySet, periodDays]);
  const weekEventInsight = useMemo(
    () =>
      analyzeTodayEvents(
        periodLogs as Array<
          MoodData & {
            log_date: Date;
            event_tags?: string[];
            event_categories?: string[];
          }
        >,
      ),
    [periodLogs],
  );
  const periodTopActivities = useMemo(() => {
    if (!weekEventInsight) return [];
    const fromTags = weekEventInsight.topEvents.slice(0, 3);
    if (fromTags.length > 0) return fromTags;
    if (
      weekEventInsight.topCategoryCount > 0 &&
      weekEventInsight.topCategory
    ) {
      return [
        {
          label: weekEventInsight.topCategory,
          count: weekEventInsight.topCategoryCount,
        },
      ];
    }
    return [];
  }, [weekEventInsight]);
  const periodTotalCheckIns = periodLogs.length;
  const weekMoodCharts = useMemo(() => {
    if (!periodDays) {
      return { byMood: [], totalCheckIns: 0 };
    }
    const end = new Date();
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (periodDays - 1));
    return buildMoodCharts(periodLogs, start.getTime(), end.getTime());
  }, [periodLogs, periodDays]);
  const weekFrequencySegments = useMemo(
    () =>
      weekMoodCharts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? "" : "s"}`,
        })),
    [weekMoodCharts],
  );
  const weekDurationBars = useMemo(
    () =>
      [...weekMoodCharts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [weekMoodCharts],
  );
  const weekIntensityBars = useMemo(
    () =>
      [...weekMoodCharts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [weekMoodCharts],
  );
  const selectedWeekMoodSummary = useMemo(() => {
    if (!selectedWeekMood) return null;
    return (
      weekMoodCharts.byMood.find((x) => x.mood === selectedWeekMood) ?? null
    );
  }, [selectedWeekMood, weekMoodCharts]);
  const weekWellnessStats = useMemo(() => {
    if (periodLogs.length === 0) {
      return {
        stressLabel: "not enough stress data",
        energyLabel: "not enough energy data",
        stability: null as number | null,
        sleepLabel: "not enough sleep data",
        emotionLabel: "not enough emotion data",
      };
    }
    let stressSum = 0;
    let stressN = 0;
    let energySum = 0;
    let energyN = 0;
    let sleepGood = 0;
    let sleepFair = 0;
    let sleepPoor = 0;
    for (const log of periodLogs) {
      if (typeof log.stress_level === "number") {
        stressSum += toFiveScale(log.stress_level, 3);
        stressN += 1;
      }
      if (typeof log.energy_level === "number") {
        energySum += toFiveScale(log.energy_level, 3);
        energyN += 1;
      }
      const sq = log.sleep_quality;
      if (sq === "good") sleepGood += 1;
      else if (sq === "fair") sleepFair += 1;
      else if (sq === "poor") sleepPoor += 1;
    }
    const stressAvg = stressN > 0 ? stressSum / stressN : null;
    const energyAvg = energyN > 0 ? energySum / energyN : null;
    const entries = moodLogsToMoodEntries(
      logs as (MoodData & { log_date: Date })[],
    ).filter((e) => !!e.dayKey && periodDayKeySet.has(e.dayKey));
    const stability =
      entries.length > 0
        ? moodStabilityScore(entries.map((e) => e.intensity))
        : null;
    const sleepKnown = sleepGood + sleepFair + sleepPoor;
    let sleepLabel = "not enough sleep data";
    if (sleepKnown > 0) {
      if (sleepGood >= sleepFair && sleepGood >= sleepPoor)
        sleepLabel = "mostly good";
      else if (sleepPoor >= sleepGood && sleepPoor >= sleepFair)
        sleepLabel = "mostly poor";
      else sleepLabel = "mostly fair";
    }
    const emotionLabel =
      dominantEmotionLabelFromLogs(periodLogs, weekMoodCharts) ??
      "not enough emotion data";
    return {
      stressLabel: stressCategoryFromFive(stressAvg),
      energyLabel: energyCategoryFromFive(energyAvg),
      stability,
      sleepLabel,
      emotionLabel,
    };
  }, [periodLogs, logs, periodDayKeySet, weekMoodCharts]);
  const periodDominantMoodDisplay = useMemo(
    () => dominantMoodDisplayFromLogs(periodLogs, weekMoodCharts),
    [periodLogs, weekMoodCharts],
  );
  const weekAverageMoodColor = useMemo(
    () =>
      dominantMoodAccentColor(
        periodDominantMoodDisplay.label,
        periodMoodMeta.color,
      ),
    [periodDominantMoodDisplay.label, periodMoodMeta.color],
  );

  const openGuide = (title: string, body: string) => {
    setActiveGuide({ title, body });
  };
  const showStabilityInfo = () =>
    openGuide(
      "Today mood stability",
      "This score reflects how steady your mood intensity is across today's check-ins. A higher percentage means your mood pattern was more consistent.",
    );
  const showMoodFrequencyGuide = () => {
    openGuide(
      "Mood frequency",
      "This pie chart shows how many check-ins each mood has today.\n\nBigger slice = higher count for that mood.\n\nIt is based on check-in count, not duration.",
    );
  };
  const showMoodDurationGuide = () => {
    openGuide(
      "Mood duration",
      "Each check-in duration is treated as look-back time from when you logged.\n\nExample: logging 10 minutes at 9:00 means 8:50 to 9:00.\n\nOverlapping time blocks of the same mood are merged so minutes are not double-counted.",
    );
  };
  const showAcademicAnalyticsGuide = () => {
    const timeWindow =
      analyticsView === "last30"
        ? "over the last 30 days"
        : analyticsView === "week"
          ? "over the last 7 days"
          : "today";
    openGuide("Academic analytics", buildAcademicAnalyticsGuideBody(timeWindow));
  };
  const showMoodIntensityGuide = () => {
    openGuide(
      "Average intensity by mood",
      "This compares average intensity (1-10) per mood for today.\n\nIt uses simple average from check-ins of that mood.\n\nn means sample size (how many entries were used for that mood).",
    );
  };
  const showTodayStressTrendGuide = () => {
    openGuide(
      "Today stress trend",
      "This chart shows stress per hourly slot today.\n\nY-axis: 1 (low) to 5 (high).\nX-axis: hour slot index.\n\nStress categories:\n- 1.0 to 1.8: Very calm\n- 1.9 to 2.6: Normal\n- 2.7 to 3.5: Stressed\n- 3.6 to 5.0: Very stressed",
    );
  };
  const showTodayEnergyTrendGuide = () => {
    openGuide(
      "Today energy trend",
      "This chart shows energy per hourly slot today.\n\nY-axis: 1 (low) to 5 (high).\nX-axis: hour slot index.\n\nEnergy categories:\n- 1.0 to 1.8: Very low energy\n- 1.9 to 2.6: Low energy\n- 2.7 to 3.5: Steady energy\n- 3.6 to 5.0: High energy",
    );
  };
  const showPeriodAverageMoodGuide = () => {
    const days = periodDays ?? 7;
    openGuide(
      "Most Frequent Mood",
      `This card shows your most frequent mood from the last ${days} days (or today on the daily view).\n\nIf two moods tie on check-in count, the one with more total logged duration wins.\n\nIt is a simple snapshot to help you notice patterns over time — not a clinical score or comparison with others.`,
    );
  };

  const stressLabelFriendly = useMemo(() => {
    const raw = (weekWellnessStats.stressLabel || "").toLowerCase().trim();
    if (raw === "very stressed") return "high";
    if (raw === "stressed") return "elevated";
    return raw || "not enough data";
  }, [weekWellnessStats.stressLabel]);

  const isPeriodView = analyticsView === "week" || analyticsView === "last30";
  const periodHeading =
    analyticsView === "last30" ? "Your last 30 days" : "Your last 7 days";
  const periodSubtitle =
    analyticsView === "last30"
      ? "Quick mood highlights from your last 30 days."
      : "Quick mood highlights from your last 7 days.";
  const periodWindowDays = periodDays ?? 7;

  if (loading && !refreshing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator color={AURORA.blue} />
        <Text style={{ color: AURORA.textSec, marginTop: 12 }}>
          Loading your analytics…
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 72 }}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURORA.blue}
          />
        }
      >
        {totalCheckIns === 0 ? (
          reduceMotion ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 24,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 44 }}>🌿</Text>
              <Text
                style={{
                  color: AURORA.textSec,
                  fontSize: 14,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
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
              alignSelf: "flex-start",
              backgroundColor: "rgba(124, 58, 237, 0.16)",
              borderRadius: 999,
              padding: ANALYTICS_VIEW_TOGGLE_PAD,
              borderWidth: 1,
              borderColor: "rgba(124, 58, 237, 0.38)",
              shadowColor: "#7C3AED",
              shadowOpacity: 0.22,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              ...(Platform.OS === "android"
                ? { elevation: 0 }
                : { elevation: 4 }),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Animated.View
              {...ANDROID_ANIMATABLE_STABILITY}
              pointerEvents="none"
              style={analyticsViewThumbStyle}
            />
            <View style={{ flexDirection: "row", alignItems: "stretch" }}>
              <TouchableOpacity
                onPress={() => setAnalyticsView("today")}
                onLayout={(e) => onAnalyticsViewSegmentLayout("today", e)}
                style={{
                  width: 104,
                  minWidth: 72,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={{
                    color:
                      analyticsView === "today" ? "#FFFFFF" : AURORA.textMuted,
                    fontWeight: "700",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAnalyticsView("week")}
                onLayout={(e) => onAnalyticsViewSegmentLayout("week", e)}
                style={{
                  width: 88,
                  minWidth: 72,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={{
                    color:
                      analyticsView === "week" ? "#FFFFFF" : AURORA.textMuted,
                    fontWeight: "700",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  7 days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAnalyticsView("last30")}
                onLayout={(e) => onAnalyticsViewSegmentLayout("last30", e)}
                style={{
                  width: 88,
                  minWidth: 72,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={{
                    color:
                      analyticsView === "last30"
                        ? "#FFFFFF"
                        : AURORA.textMuted,
                    fontWeight: "700",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  30 days
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {analyticsView === "today" ? (
          <View key="analytics-today">
            <AnalyticsPanel reduceMotion={reduceMotion} delayMs={0}>
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontSize: 22,
                  fontWeight: "800",
                  marginBottom: 6,
                }}
              >
                Today
              </Text>
              <Text
                style={{
                  color: AURORA.textSec,
                  fontSize: 14,
                  lineHeight: 21,
                  marginBottom: UI_SECTION_GAP,
                }}
              >
                Focused insights from your current day.
              </Text>
            </AnalyticsPanel>

            <ChartSection>
              {todayEntries.length === 0 ? (
                <AnalyticsPanel reduceMotion={reduceMotion} delayMs={70}>
                  <Text style={{ color: AURORA.textSec, fontSize: 14 }}>
                    No check-ins yet today. Log your mood to unlock daily
                    analytics.
                  </Text>
                </AnalyticsPanel>
              ) : (
                <>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={60}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: hexToRgba(
                            todayDominantMoodColor,
                            0.14,
                          ),
                          borderRadius: 14,
                          padding: 12,
                          borderWidth: 1.5,
                          borderColor: hexToRgba(todayDominantMoodColor, 0.75),
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          MOST FREQUENT MOOD
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 8,
                          }}
                        >
                          <Image
                            source={
                              todayDominantMoodDisplay.icon ??
                              getMoodIconSource(todayDominantMoodDisplay.label)
                            }
                            style={{ width: 32, height: 32 }}
                            resizeMode="contain"
                            accessibilityLabel={todayDominantMoodDisplay.label}
                          />
                          <Text
                            style={{
                              color: AURORA.textPrimary,
                              fontSize: 26,
                              fontWeight: "800",
                            }}
                          >
                            {todayDominantMoodDisplay.label}
                          </Text>
                        </View>
                        {/* <Text
                          style={{
                            color: UI_TEXT_SECONDARY,
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          Avg intensity {todayMoodAgg.avgIntensity.toFixed(1)}
                          /10
                        </Text> */}
                      </View>
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: AURORA.cardAlt,
                          borderRadius: 14,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          CHECK-INS
                        </Text>
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontSize: 28,
                            fontWeight: "900",
                            marginTop: 6,
                          }}
                        >
                          {todayMoodAgg.entryCount}
                          {/* <Text
                          style={{ color: UI_TEXT_SECONDARY, fontSize: 12, marginLeft: 4 }}
                        >
                          today
                        </Text> */}
                        </Text>
      
                      </View>
                    </View>
                  </AnalyticsPanel>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={130}>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: UI_SECTION_GAP,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Sparkles size={12} color="#F59E0B" />
                        <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          TODAY MOOD STABILITY
                        </Text>
                        <TouchableOpacity
                          onPress={showStabilityInfo}
                          onLongPress={() => {}}
                          delayLongPress={10000}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          style={{ padding: 2 }}
                        >
                          <CircleHelp size={13} color={UI_TEXT_MUTED} />
                        </TouchableOpacity>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-end",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: todayBlended,
                            fontSize: 30,
                            fontWeight: "700",
                          }}
                        >
                          {todayStability}%
                        </Text>
                       
                      </View>
                    </View>
                  </AnalyticsPanel>
                  {todaySchoolAnalysis ? (
                    <AnalyticsPanel reduceMotion={reduceMotion} delayMs={200}>
                      <View
                        style={{
                          backgroundColor: AURORA.cardAlt,
                          borderRadius: 14,
                          padding: 12,
                          marginBottom: UI_SECTION_GAP,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 6,
                          }}
                        >
                          <TrendingUp size={14} color="#F59E0B" />
                          <Text
                            style={{
                              color: AURORA.textPrimary,
                              fontSize: 16,
                              fontWeight: "700",
                            }}
                          >
                            ACADEMIC LOAD
                          </Text>
                          <TouchableOpacity
                            onPress={showAcademicAnalyticsGuide}
                            onLongPress={() => {}}
                            delayLongPress={10000}
                            style={{ padding: 2 }}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            <CircleHelp size={16} color={AURORA.textMuted} />
                          </TouchableOpacity>
                        </View>
                        {/* <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          Purpose: to connect your school-related events with your
                          current mood patterns so you can make smarter study and
                          wellbeing decisions.
                        </Text> */}

                        
                        <Text
                          style={{
                            color: schoolLoadBandColor(
                              todaySchoolAnalysis.loadBand,
                            ),
                            fontSize: 26,
                            fontWeight: "900",
                            marginTop: 4,
                          }}
                        >
                          {todaySchoolAnalysis.loadBand}
                        </Text>
                        <Text
                          style={{
                            color: UI_TEXT_SECONDARY,
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          {todaySchoolAnalysis.totalSchoolEvents} school tag
                          {todaySchoolAnalysis.totalSchoolEvents === 1
                            ? ""
                            : "s"}{" "}
                          across {todaySchoolAnalysis.schoolCheckIns} check-in
                          {todaySchoolAnalysis.schoolCheckIns === 1 ? "" : "s"}
                        </Text>

                        {/* <Text
                          style={{
                            color: UI_TEXT_MUTED,
                            fontSize: 10,
                            fontWeight: "800",
                            letterSpacing: 0.5,
                            marginTop: 10,
                          }}
                        >
                          SIGNALS
                        </Text>
                        <Text
                          style={{
                            color: UI_TEXT_SECONDARY,
                            fontSize: 12,
                            marginTop: 4,
                            lineHeight: 18,
                          }}
                        >
                          School events: {todaySchoolAnalysis.totalSchoolEvents}{" "}
                          across {todaySchoolAnalysis.schoolCheckIns}{" "}
                          check-in(s)
                        </Text>
                        <Text
                          style={{
                            color: UI_TEXT_SECONDARY,
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          Mood:{" "}
                          {sentenceCase(
                            moodCategoryFromFive(todaySchoolAnalysis.avgMood5),
                          )}{" "}
                          • Stress:{" "}
                          {sentenceCase(
                            stressCategoryFromFive(
                              todaySchoolAnalysis.avgStress5,
                            ),
                          )}
                        </Text> */}
                        {todaySchoolAnalysis.topSchoolEvents.length > 0 ? (
                          <View style={{ marginTop: 8, gap: 6 }}>
                            {/* <Text
                              style={{
                                color: UI_TEXT_MUTED,
                                fontSize: 10,
                                fontWeight: "800",
                                letterSpacing: 0.5,
                                marginBottom: 2,
                              }}
                            >
                              TOP STRESSORS
                            </Text> */}
                            {todaySchoolAnalysis.topSchoolEvents.map((item) => {
                              const maxCount = Math.max(
                                1,
                                todaySchoolAnalysis.topSchoolEvents[0]?.count ??
                                  1,
                              );
                              const widthPct = Math.max(
                                18,
                                Math.round((item.count / maxCount) * 100),
                              );
                              return (
                                <View key={`today-school-${item.label}`}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      marginBottom: 3,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: AURORA.textMuted,
                                        fontSize: 11,
                                        fontWeight: "700",
                                      }}
                                    >
                                      {item.label}
                                    </Text>
                                    <Text
                                      style={{
                                        color: AURORA.textMuted,
                                        fontSize: 11,
                                        fontWeight: "700",
                                      }}
                                    >
                                      {item.count}
                                    </Text>
                                  </View>
                                  <View
                                    style={{
                                      height: 7,
                                      borderRadius: 999,
                                      backgroundColor: "rgba(255,255,255,0.08)",
                                    }}
                                  >
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
                      </View>
                    </AnalyticsPanel>
                  ) : null}
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={270}>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                      }}
                    >
                      {todayEventInsight ? (
                        <>
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 10,
                              fontWeight: "700",
                            }}
                          >
                            TOP ACTIVITY FOR TODAY
                          </Text>
                          {todayEventInsight.categoryBreakdown.length > 0 ? (
                            <View style={{ marginTop: 8, gap: 8 }}>
                              {todayEventInsight.categoryBreakdown
                                .slice(0, 3)
                                .map((item) => (
                                  <TodayFocusMetricRow
                                    key={`activity-${item.label}`}
                                    label={item.label}
                                    count={item.count}
                                    maxCount={Math.max(
                                      1,
                                      ...todayEventInsight.categoryBreakdown.map(
                                        (x) => x.count,
                                      ),
                                    )}
                                    barColor={AURORA.purple}
                                  />
                                ))}
                            </View>
                          ) : (
                            <Text
                              style={{
                                color: AURORA.textMuted,
                                fontSize: 12,
                                marginTop: 8,
                              }}
                            >
                              No activity categories tagged today.
                            </Text>
                          )}

                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 10,
                              fontWeight: "700",
                              marginTop: 14,
                            }}
                          >
                            TOP EVENT
                          </Text>
                          {todayEventInsight.topEvents.length > 0 ? (
                            <View style={{ marginTop: 8, gap: 8 }}>
                              {todayEventInsight.topEvents
                                .slice(0, 3)
                                .map((item) => (
                                  <TodayFocusMetricRow
                                    key={`event-${item.label}`}
                                    label={item.label}
                                    count={item.count}
                                    maxCount={Math.max(
                                      1,
                                      ...todayEventInsight.topEvents.map(
                                        (x) => x.count,
                                      ),
                                    )}
                                    barColor={AURORA.blue}
                                  />
                                ))}
                            </View>
                          ) : (
                            <Text
                              style={{
                                color: AURORA.textMuted,
                                fontSize: 12,
                                marginTop: 8,
                              }}
                            >
                              No event tags in today&apos;s check-ins yet.
                            </Text>
                          )}
                        </>
                      ) : (
                        <View
                          style={{
                            alignItems: "center",
                            paddingVertical: 20,
                            paddingHorizontal: 8,
                            marginTop: 4,
                          }}
                        >
                          <Tags size={40} color={AURORA.textMuted} />
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 15,
                              fontWeight: "700",
                              marginTop: 12,
                            }}
                          >
                            No event tags yet
                          </Text>
                          <Text
                            style={{
                              color: AURORA.textMuted,
                              fontSize: 13,
                              textAlign: "center",
                              marginTop: 6,
                              lineHeight: 18,
                              maxWidth: 280,
                            }}
                          >
                            None in today&apos;s check-ins. Add tags when you
                            log your mood to see categories here.
                          </Text>
                        </View>
                      )}
                    </View>
                  </AnalyticsPanel>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={340}>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 4,
                          gap: 6,
                        }}
                      >
                        <PieChart size={14} color="#F59E0B" />
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          MOOD FREQUENCY
                        </Text>
                        <TouchableOpacity
                          onPress={showMoodFrequencyGuide}
                          onLongPress={() => {}}
                          delayLongPress={10000}
                          style={{ padding: 2 }}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <CircleHelp size={16} color={AURORA.textMuted} />
                        </TouchableOpacity>
                      </View>
                      {/* <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 12,
                          marginBottom: 8,
                        }}
                      >
                        Share of today&apos;s check-ins by mood.
                      </Text> */}
                      <MoodDistributionDonut
                        title=""
                        caption=""
                        segments={todayFrequencySegments.map((x) => ({
                          label: x.label,
                          value: x.value,
                          color: x.color,
                          hint: x.hint,
                        }))}
                        centerValue={String(todayMoodCharts.totalCheckIns)}
                        centerLabel={
                          selectedMoodSummary
                            ? `${selectedMoodSummary.label} selected`
                            : "check-ins"
                        }
                        selectedSegmentLabel={
                          selectedMoodSummary?.label ?? null
                        }
                        onSegmentPress={(label) => {
                          const moodKey =
                            todayFrequencySegments.find(
                              (x) => x.label === label,
                            )?.mood ?? null;
                          if (!moodKey) return;
                          setSelectedTodayMood((prev) =>
                            prev === moodKey ? null : moodKey,
                          );
                        }}
                      />
                      {selectedMoodSummary ? (
                        <TouchableOpacity
                          onPress={() => setSelectedTodayMood(null)}
                          style={{
                            marginTop: 8,
                            alignSelf: "flex-start",
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "rgba(124,58,237,0.45)",
                            backgroundColor: "rgba(124,58,237,0.16)",
                          }}
                        >
                          <Text
                            style={{
                              color: AURORA.textPrimary,
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            Clear highlight
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </AnalyticsPanel>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={390}>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 10,
                          gap: 6,
                        }}
                      >
                        <Clock3 size={14} color="#F59E0B" />
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          MOOD DURATION
                        </Text>
                        <TouchableOpacity
                          onPress={showMoodDurationGuide}
                          onLongPress={() => {}}
                          delayLongPress={10000}
                          style={{ padding: 2 }}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <CircleHelp size={16} color={AURORA.textMuted} />
                        </TouchableOpacity>
                      </View>
                      {todayDurationBars.length === 0 ? (
                        <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                          No duration entries yet for today.
                        </Text>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {todayDurationBars.map((item) => {
                            const maxMinutes = Math.max(
                              1,
                              todayDurationBars[0]?.totalMinutes ?? 1,
                            );
                            const widthPct = Math.max(
                              10,
                              Math.round(
                                (item.totalMinutes / maxMinutes) * 100,
                              ),
                            );
                            return (
                              <View key={`today-duration-${item.mood}`}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: AURORA.textPrimary,
                                      fontSize: 12,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {item.label}
                                  </Text>
                                  <Text
                                    style={{
                                      color: AURORA.textMuted,
                                      fontSize: 11,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {item.totalMinutes} min
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    opacity:
                                      selectedTodayMood &&
                                      selectedTodayMood !== item.mood
                                        ? 0.38
                                        : 1,
                                    height: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(255,255,255,0.10)",
                                  }}
                                >
                                  <View
                                    style={{
                                      width: `${widthPct}%`,
                                      height: 8,
                                      borderRadius: 999,
                                      backgroundColor: item.color,
                                    }}
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </AnalyticsPanel>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={440}>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 10,
                          gap: 6,
                        }}
                      >
                        <BarChart3 size={14} color="#F59E0B" />
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          AVERAGE INTENSITY
                        </Text>
                        <TouchableOpacity
                          onPress={showMoodIntensityGuide}
                          onLongPress={() => {}}
                          delayLongPress={10000}
                          style={{ padding: 2 }}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <CircleHelp size={16} color={AURORA.textMuted} />
                        </TouchableOpacity>
                      </View>
                      {todayIntensityBars.length === 0 ? (
                        <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                          No intensity entries yet for today.
                        </Text>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {todayIntensityBars.map((item) => {
                            const widthPct = Math.max(
                              10,
                              Math.round((item.averageIntensity / 10) * 100),
                            );
                            return (
                              <View key={`today-intensity-${item.mood}`}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 4,
                                    opacity:
                                      selectedTodayMood &&
                                      selectedTodayMood !== item.mood
                                        ? 0.38
                                        : 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: AURORA.textPrimary,
                                      fontSize: 12,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {item.label}
                                  </Text>
                                  <View
                                    style={{
                                      marginLeft: 8,
                                      paddingHorizontal: 7,
                                      paddingVertical: 2,
                                      borderRadius: 999,
                                      borderWidth: 1,
                                      borderColor: "rgba(255,255,255,0.22)",
                                      backgroundColor: "rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: AURORA.textSec,
                                        fontSize: 10,
                                        fontWeight: "700",
                                      }}
                                    >
                                      n={item.intensitySamples}
                                    </Text>
                                  </View>
                                  {/* {item.intensitySamples < 3 ? (
                                    <View
                                      style={{
                                        marginLeft: 6,
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: "rgba(250,204,21,0.45)",
                                        backgroundColor:
                                          "rgba(250,204,21,0.14)",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: AURORA.amber,
                                          fontSize: 10,
                                          fontWeight: "700",
                                        }}
                                      >
                                        Low confidence
                                      </Text>
                                    </View>
                                  ) : null} */}
                                  <Text
                                    style={{
                                      color: AURORA.textMuted,
                                      fontSize: 11,
                                      fontWeight: "700",
                                      marginLeft: "auto",
                                    }}
                                  >
                                    {item.averageIntensity.toFixed(1)} / 10
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    opacity:
                                      selectedTodayMood &&
                                      selectedTodayMood !== item.mood
                                        ? 0.38
                                        : 1,
                                    height: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(255,255,255,0.10)",
                                  }}
                                >
                                  <View
                                    style={{
                                      width: `${widthPct}%`,
                                      height: 8,
                                      borderRadius: 999,
                                      backgroundColor: item.color,
                                    }}
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </AnalyticsPanel>
                  <AnalyticsPanel reduceMotion={reduceMotion} delayMs={490}>
                    {todayStressEnergyTrend.canShow ? (
                      <View
                        style={{
                          backgroundColor: AURORA.cardAlt,
                          borderRadius: 14,
                          padding: 12,
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          {/* <Text
                            style={{
                              color: AURORA.textMuted,
                              fontSize: 10,
                              fontWeight: "700",
                            }}
                          >
                            STRESS & ENERGY TREND
                          </Text> */}
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <TrendingUp size={14} color="#F59E0B" />
                          <Text
                            style={{
                              color: AURORA.textPrimary,
                              fontSize: 16,
                              fontWeight: "700",
                            }}
                          >
                            STRESS AND ENERGY BY HOUR
                          </Text>
                        </View>
                        {/* <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          Each bar compares average level in an hourly slot
                          today.
                        </Text> */}
                        {todayStressEnergyTrend.showStressChart ? (
                          <View style={{ marginBottom: 12 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 10,
                                  fontWeight: "700",
                                }}
                              >
                                STRESS TREND
                              </Text>
                              <TouchableOpacity
                                onPress={showTodayStressTrendGuide}
                                onLongPress={() => {}}
                                delayLongPress={10000}
                                style={{ padding: 4, marginLeft: 6 }}
                                hitSlop={{
                                  top: 8,
                                  right: 8,
                                  bottom: 8,
                                  left: 8,
                                }}
                              >
                                <CircleHelp size={13} color={AURORA.textMuted} />
                              </TouchableOpacity>
                            </View>
                            {/* <Text
                              style={{
                                color: AURORA.textSec,
                                fontSize: 12,
                                marginBottom: 8,
                              }}
                            >
                              Higher bars show hours where stress was higher.
                            </Text> */}
                            <TodayHourlyMetricChart
                              bars={todayStressEnergyTrend.bars}
                              metric="stress"
                              barColor={AURORA.moodAngry}
                            />
                          </View>
                        ) : null}
                        {todayStressEnergyTrend.showEnergyChart ? (
                          <View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 10,
                                  fontWeight: "700",
                                }}
                              >
                                ENERGY TREND
                              </Text>
                              <TouchableOpacity
                                onPress={showTodayEnergyTrendGuide}
                                onLongPress={() => {}}
                                delayLongPress={10000}
                                style={{ padding: 4, marginLeft: 6 }}
                                hitSlop={{
                                  top: 8,
                                  right: 8,
                                  bottom: 8,
                                  left: 8,
                                }}
                              >
                                <CircleHelp size={13} color={AURORA.textMuted} />
                              </TouchableOpacity>
                            </View>
                            {/* <Text
                              style={{
                                color: AURORA.textSec,
                                fontSize: 12,
                                marginBottom: 8,
                              }}
                            >
                              Higher bars show hours where energy felt stronger.
                            </Text> */}
                            <TodayHourlyMetricChart
                              bars={todayStressEnergyTrend.bars}
                              metric="energy"
                              barColor={AURORA.moodHappy}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: AURORA.cardAlt,
                          borderRadius: 14,
                          padding: 12,
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.textMuted,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          STRESS & ENERGY TREND
                        </Text>
                        <View
                          style={{
                            alignItems: "center",
                            paddingVertical: 20,
                            paddingHorizontal: 8,
                            marginTop: 4,
                          }}
                        >
                          <TrendingUp size={40} color={AURORA.textMuted} />
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 15,
                              fontWeight: "700",
                              marginTop: 12,
                            }}
                          >
                            Need more check-ins
                          </Text>
                          <Text
                            style={{
                              color: AURORA.textMuted,
                              fontSize: 13,
                              textAlign: "center",
                              marginTop: 6,
                              lineHeight: 18,
                              maxWidth: 280,
                            }}
                          >
                            Log at least 2 check-ins today to unlock your stress
                            and energy trend graphs.
                          </Text>
                        </View>
                      </View>
                    )}
                  </AnalyticsPanel>
                </>
              )}
            </ChartSection>
          </View>
        ) : null}

        {isPeriodView ? (
          <View key={`analytics-period-${analyticsView}`}>
            <AnalyticsPanel reduceMotion={reduceMotion} delayMs={0}>
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontSize: 22,
                  fontWeight: "800",
                  marginBottom: 8,
                }}
              >
                {periodHeading}
              </Text>
              <Text
                style={{
                  color: AURORA.textSec,
                  fontSize: 14,
                  lineHeight: 21,
                  marginBottom: 0,
                }}
              >
                {periodSubtitle}
              </Text>
              {/* <EthicsLine /> */}
            </AnalyticsPanel>

            <View style={{ marginTop: 18, marginBottom: 8 }}>
              <AnalyticsPanel reduceMotion={reduceMotion} delayMs={80}>
                {(() => {
                  const weekPills = [
                    {
                      key: "days" as const,
                      label: "Days logged",
                      value: `${periodDaysLogged}/${periodWindowDays}`,
                    },
                    {
                      key: "checkins" as const,
                      label: "Check-ins",
                      value: String(periodTotalCheckIns),
                    },
                    {
                      key: "streak" as const,
                      label: "Best streak",
                      value: String(Math.round(animPeriodHighestStreak)),
                    },
                  ];
                  const explainer =
                    activeWeekPill === "days"
                      ? `${periodDaysLogged} out of ${periodWindowDays} days had at least one mood check-in.`
                      : activeWeekPill === "checkins"
                        ? `You logged ${periodTotalCheckIns} mood entries in the last ${periodWindowDays} days.`
                        : activeWeekPill === "streak"
                          ? `Your longest check-in streak in the last ${periodWindowDays} days was ${Math.round(animPeriodHighestStreak)} day${Math.round(animPeriodHighestStreak) === 1 ? "" : "s"}.`
                          : null;
                  return (
                    <>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 14 }}
                        contentContainerStyle={{
                          flexGrow: 1,
                          justifyContent: "center",
                        }}
                      >
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {weekPills.map((pill) => (
                            <TouchableOpacity
                              key={pill.label}
                              activeOpacity={0.9}
                              onPress={() =>
                                setActiveWeekPill((prev) =>
                                  prev === pill.key ? null : pill.key,
                                )
                              }
                              style={{
                                width: 113,
                                backgroundColor:
                                  activeWeekPill === pill.key
                                    ? "rgba(45, 107, 255, 0.18)"
                                    : "rgba(15, 24, 64, 0.88)",
                                padding: 13,
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor:
                                  activeWeekPill === pill.key
                                    ? AURORA.blue
                                    : AURORA.border,
                                shadowColor:
                                  activeWeekPill === pill.key
                                    ? AURORA.blue
                                    : "#000",
                                shadowOpacity:
                                  activeWeekPill === pill.key ? 0.28 : 0.18,
                                shadowRadius:
                                  activeWeekPill === pill.key ? 10 : 8,
                                shadowOffset: { width: 0, height: 6 },
                                elevation: activeWeekPill === pill.key ? 5 : 3,
                              }}
                            >
                              <Text
                                style={{
                                  color: UI_TEXT_MUTED,
                                  fontSize: 10,
                                  fontWeight: "800",
                                  letterSpacing: 0.7,
                                }}
                              >
                                {pill.label.toUpperCase()}
                              </Text>
                              <Text
                                style={{
                                  color: AURORA.textPrimary,
                                  fontSize: 24,
                                  fontWeight: "900",
                                  marginTop: 8,
                                }}
                              >
                                {pill.value}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      {/* <Text
                      style={{
                        color: UI_TEXT_SECONDARY,
                        fontSize: 11,
                        marginBottom: 10,
                      }}
                    >
                      Based on your last 7 days of check-ins.
                    </Text> */}
                      {explainer ? (
                        <View
                          style={{
                            backgroundColor: "rgba(45, 107, 255, 0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(45, 107, 255, 0.28)",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 12,
                              lineHeight: 17,
                            }}
                          >
                            {explainer}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  );
                })()}
              </AnalyticsPanel>

              <AnalyticsPanel
                reduceMotion={reduceMotion}
                delayMs={160}
                style={{ width: "100%", marginBottom: 20 }}
                iosFadeDuration={520}
              >
                {/* Android: avoid translucent fill + elevation on the native-driver parent (sharp dark backing). */}
                <View
                  style={{
                    width: "100%",
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: hexToRgba(weekAverageMoodColor, 0.14),
                    padding: 20,
                    borderWidth: 1.5,
                    borderColor: hexToRgba(weekAverageMoodColor, 0.75),
                    ...(Platform.OS === "ios"
                      ? {
                          shadowColor: weekAverageMoodColor,
                          shadowOpacity: 0.26,
                          shadowRadius: 16,
                          shadowOffset: { width: 0, height: 10 },
                        }
                      : { elevation: 0 }),
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 11,
                        fontWeight: "800",
                        letterSpacing: 0.6,
                      }}
                    >
                      MOST FREQUENT MOOD
                    </Text>
                    <TouchableOpacity
                      onPress={showPeriodAverageMoodGuide}
                      onLongPress={() => {}}
                      delayLongPress={10000}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      style={{ padding: 2 }}
                    >
                      <CircleHelp size={14} color={UI_TEXT_MUTED} />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingTop: 16,
                      paddingBottom: 4,
                      gap: 10,
                    }}
                  >
                    <Image
                      source={
                        periodDominantMoodDisplay.icon ??
                        getMoodIconSource(periodDominantMoodDisplay.label)
                      }
                      style={{ width: 56, height: 56 }}
                      resizeMode="contain"
                      accessibilityLabel={periodDominantMoodDisplay.label}
                    />
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 28,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {periodDominantMoodDisplay.label}
                    </Text>
                  </View>
                </View>
              </AnalyticsPanel>

              {periodTotalCheckIns > 0 ? (
                <ChartSection>
                  <AnalyticsMoodWidgets
                    logs={logs as (MoodData & { log_date: Date })[]}
                    period={analyticsView === "last30" ? "last30" : "week"}
                  />
                </ChartSection>
              ) : null}
              <AnalyticsPanel reduceMotion={reduceMotion} delayMs={220}>
                <View
                  style={{
                    backgroundColor: AURORA.cardAlt,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <PieChart size={14} color="#F59E0B" />
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      MOOD FREQUENCY
                    </Text>
                    <TouchableOpacity
                      onPress={showMoodFrequencyGuide}
                      onLongPress={() => {}}
                      delayLongPress={10000}
                      style={{ padding: 2 }}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CircleHelp size={16} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {/* <Text
                    style={{
                      color: AURORA.textSec,
                      fontSize: 12,
                      marginVertical: 8,
                    }}
                  >
                    Share of your last 7 days check-ins by mood.
                  </Text> */}
                  <MoodDistributionDonut
                    title=""
                    caption=""
                    segments={weekFrequencySegments.map((x) => ({
                      label: x.label,
                      value: x.value,
                      color: x.color,
                      hint: x.hint,
                    }))}
                    centerValue={String(weekMoodCharts.totalCheckIns)}
                    centerLabel={
                      selectedWeekMoodSummary
                        ? `${selectedWeekMoodSummary.label} selected`
                        : "check-ins"
                    }
                    selectedSegmentLabel={
                      selectedWeekMoodSummary?.label ?? null
                    }
                    onSegmentPress={(label) => {
                      const moodKey =
                        weekFrequencySegments.find((x) => x.label === label)
                          ?.mood ?? null;
                      if (!moodKey) return;
                      setSelectedWeekMood((prev) =>
                        prev === moodKey ? null : moodKey,
                      );
                    }}
                  />
                  {selectedWeekMoodSummary ? (
                    <TouchableOpacity
                      onPress={() => setSelectedWeekMood(null)}
                      style={{
                        marginTop: 8,
                        alignSelf: "flex-start",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "rgba(124,58,237,0.45)",
                        backgroundColor: "rgba(124,58,237,0.16)",
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textPrimary,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        Clear highlight
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </AnalyticsPanel>
              <AnalyticsPanel reduceMotion={reduceMotion} delayMs={260}>
                <View
                  style={{
                    backgroundColor: AURORA.cardAlt,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Clock3 size={14} color="#F59E0B" />
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      MOOD DURATION
                    </Text>
                    <TouchableOpacity
                      onPress={showMoodDurationGuide}
                      onLongPress={() => {}}
                      delayLongPress={10000}
                      style={{ padding: 2 }}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CircleHelp size={16} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {weekDurationBars.length === 0 ? (
                    <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                      {`No duration entries yet for the last ${periodWindowDays} days.`}
                    </Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {weekDurationBars.map((item) => {
                        const maxMinutes = Math.max(
                          1,
                          weekDurationBars[0]?.totalMinutes ?? 1,
                        );
                        const widthPct = Math.max(
                          10,
                          Math.round((item.totalMinutes / maxMinutes) * 100),
                        );
                        return (
                          <View key={`week-duration-${item.mood}`}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textPrimary,
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  color: AURORA.textMuted,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {item.totalMinutes} min
                              </Text>
                            </View>
                            <View
                              style={{
                                opacity:
                                  selectedWeekMood &&
                                  selectedWeekMood !== item.mood
                                    ? 0.38
                                    : 1,
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.10)",
                              }}
                            >
                              <View
                                style={{
                                  width: `${widthPct}%`,
                                  height: 8,
                                  borderRadius: 999,
                                  backgroundColor: item.color,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </AnalyticsPanel>
              <AnalyticsPanel reduceMotion={reduceMotion} delayMs={300}>
                <View
                  style={{
                    backgroundColor: AURORA.cardAlt,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <BarChart3 size={14} color="#F59E0B" />
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      AVERAGE INTENSITY
                    </Text>
                    <TouchableOpacity
                      onPress={showMoodIntensityGuide}
                      onLongPress={() => {}}
                      delayLongPress={10000}
                      style={{ padding: 2 }}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CircleHelp size={16} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {weekIntensityBars.length === 0 ? (
                    <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                      {`No intensity entries yet for the last ${periodWindowDays} days.`}
                    </Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {weekIntensityBars.map((item) => {
                        const widthPct = Math.max(
                          10,
                          Math.round((item.averageIntensity / 10) * 100),
                        );
                        return (
                          <View key={`week-intensity-${item.mood}`}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 4,
                                opacity:
                                  selectedWeekMood &&
                                  selectedWeekMood !== item.mood
                                    ? 0.38
                                    : 1,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textPrimary,
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                {item.label}
                              </Text>
                              <View
                                style={{
                                  marginLeft: 8,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.22)",
                                  backgroundColor: "rgba(255,255,255,0.08)",
                                }}
                              >
                                <Text
                                  style={{
                                    color: AURORA.textSec,
                                    fontSize: 10,
                                    fontWeight: "700",
                                  }}
                                >
                                  n={item.intensitySamples}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  color: AURORA.textMuted,
                                  fontSize: 11,
                                  fontWeight: "700",
                                  marginLeft: "auto",
                                }}
                              >
                                {item.averageIntensity.toFixed(1)} / 10
                              </Text>
                            </View>
                            <View
                              style={{
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.10)",
                              }}
                            >
                              <View
                                style={{
                                  width: `${widthPct}%`,
                                  height: 8,
                                  borderRadius: 999,
                                  backgroundColor: item.color,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </AnalyticsPanel>
            </View>

            {celebrateMilestone ? (
              Platform.OS === "android" ? (
                <View
                  style={{
                    marginBottom: 14,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: "rgba(254, 189, 3, 0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(254, 189, 3, 0.35)",
                  }}
                >
                  <Text
                    style={{
                      color: AURORA.amber,
                      fontSize: 15,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    Nice milestone — keep caring for yourself!
                  </Text>
                </View>
              ) : (
                <Animatable.View
                  animation="fadeInDown"
                  duration={450}
                  useNativeDriver
                  style={{
                    marginBottom: 14,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: "rgba(254, 189, 3, 0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(254, 189, 3, 0.35)",
                  }}
                >
                  <Text
                    style={{
                      color: AURORA.amber,
                      fontSize: 15,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    Nice milestone — keep caring for yourself!
                  </Text>
                </Animatable.View>
              )
            ) : null}

            <View
              style={{
                backgroundColor: "rgba(22, 34, 92, 0.8)",
                padding: 18,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(91, 117, 255, 0.32)",
                shadowColor: "#5B75FF",
                shadowOpacity: 0.2,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 8 },
                elevation: 5,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                {aiLoading && !reduceMotion && Platform.OS !== "android" ? (
                  <Animatable.View
                    {...ANDROID_ANIMATABLE_STABILITY}
                    animation="pulse"
                    iterationCount="infinite"
                    duration={1400}
                  >
                    <Sparkles size={24} color={AURORA.blue} />
                  </Animatable.View>
                ) : (
                  <Sparkles size={24} color={AURORA.blue} />
                )}
                <Text
                  style={{
                    color: AURORA.textPrimary,
                    fontSize: 18,
                    fontWeight: "800",
                    flex: 1,
                  }}
                >
                  {`Written summary for the last ${periodWindowDays} days`}
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
                    fontStyle: "italic",
                  }}
                >
                  Generating your summary…
                </Text>
              ) : null}
              {periodDays === 7 && aiLoading ? (
                <AISummarySkeleton reduceMotion={reduceMotion} />
              ) : periodDays === 30 || weeklyAi ? (
                <>
                  {periodWrittenSummary ? (
                    <Text
                      style={{
                        color: AURORA.textSec,
                        fontSize: 14,
                        lineHeight: 22,
                        marginBottom: 12,
                      }}
                    >
                      {periodWrittenSummary}
                    </Text>
                  ) : null}
                  <View style={{ marginBottom: 14, gap: 6 }}>
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      Stress:{" "}
                      <Text style={{ color: UI_TEXT_SECONDARY }}>
                        {sentenceCase(stressLabelFriendly)}
                      </Text>
                    </Text>
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      Energy:{" "}
                      <Text style={{ color: UI_TEXT_SECONDARY }}>
                        {sentenceCase(weekWellnessStats.energyLabel)}
                      </Text>
                    </Text>
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      Sleep:{" "}
                      <Text style={{ color: UI_TEXT_SECONDARY }}>
                        {sentenceCase(weekWellnessStats.sleepLabel)}
                      </Text>
                    </Text>
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      Mood stability:{" "}
                      <Text style={{ color: UI_TEXT_SECONDARY }}>
                        {weekWellnessStats.stability != null
                          ? `${weekWellnessStats.stability}%`
                          : "not enough data"}
                      </Text>
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textPrimary,
                          fontSize: 14,
                          lineHeight: 22,
                          flex: 1,
                        }}
                      >
                        School load:{" "}
                        <Text
                          style={{
                            color: weekSchoolAnalysis
                              ? schoolLoadBandColor(weekSchoolAnalysis.loadBand)
                              : UI_TEXT_SECONDARY,
                            fontWeight: "700",
                          }}
                        >
                          {weekSchoolAnalysis?.loadBand ??
                            `No school-tagged check-ins in the last ${periodWindowDays} days.`}
                        </Text>
                      </Text>
                      <TouchableOpacity
                        onPress={showAcademicAnalyticsGuide}
                        onLongPress={() => {}}
                        delayLongPress={10000}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={{ padding: 2, marginTop: 1 }}
                      >
                        <CircleHelp size={16} color={AURORA.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {weekSchoolAnalysis?.topSchoolEvents?.length ? (
                    <View
                      style={{
                        marginTop: 2,
                        marginBottom: 10,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: "rgba(45, 107, 255, 0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(45, 107, 255, 0.24)",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textPrimary,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        TOP ACADEMIC ACTIVITIES
                      </Text>
                     
                      {weekSchoolAnalysis.topSchoolEvents.map((item) => {
                        const maxCount = Math.max(
                          1,
                          weekSchoolAnalysis.topSchoolEvents[0]?.count ?? 1,
                        );
                        const widthPct = Math.max(
                          18,
                          Math.round((item.count / maxCount) * 100),
                        );
                        return (
                          <View key={`weekly-summary-school-${item.label}`}>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginBottom: 3,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {item.count}
                              </Text>
                            </View>
                            <View
                              style={{
                                height: 7,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.08)",
                              }}
                            >
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
                  {periodTopActivities.length > 0 ? (
                    <View
                      style={{
                        marginTop: weekSchoolAnalysis?.topSchoolEvents?.length
                          ? 8
                          : 2,
                        marginBottom: 10,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: "rgba(45, 107, 255, 0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(45, 107, 255, 0.24)",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textPrimary,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        TOP ACTIVITIES
                      </Text>
                      {periodTopActivities.map((item) => {
                        const maxCount = Math.max(
                          1,
                          periodTopActivities[0]?.count ?? 1,
                        );
                        const widthPct = Math.max(
                          18,
                          Math.round((item.count / maxCount) * 100),
                        );
                        return (
                          <View
                            key={`period-summary-activity-${item.label}`}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginBottom: 3,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  color: AURORA.textSec,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {item.count}
                              </Text>
                            </View>
                            <View
                              style={{
                                height: 7,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.08)",
                              }}
                            >
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
                  {weeklyAi?.support_note ? (
                    <Text
                      style={{
                        color: AURORA.amber,
                        fontSize: 14,
                        marginTop: 14,
                        lineHeight: 21,
                      }}
                    >
                      {weeklyAi.support_note}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: AURORA.textSec, fontSize: 14 }}>
                  Summary will show after your data loads.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <InfoGuideModal
        guide={activeGuide}
        onClose={() => setActiveGuide(null)}
      />
    </>
  );
}
