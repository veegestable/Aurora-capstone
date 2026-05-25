import { AppText as Text } from "../common/AppText";
/**
 * Counselor-facing mood journal calendar for one student when journal access is granted.
 * Mirrors student Journal tab layout (month grid + day detail).
 */

import React, { useEffect, useMemo, useState } from "react";
import { type ImageSourcePropType, View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import {
  ChevronLeft,
  ChevronRight,
  BookMarked,
  BarChart3,
  Timer,
  Bath,
  UtensilsCrossed,
  Tags,
  NotebookPen,
  Image as ImageIcon,
} from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { moodService } from "../../services/mood.service";
import { AURORA } from "../../constants/aurora-colors";
import {
  MOOD_COLORS,
  blendMoodColors,
  generateExplanation,
  type MoodLog,
} from "../../utils/blendMoods";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const UI_TEXT_MUTED = "#9AA9C8";
const UI_TEXT_SECONDARY = "#C1CEE9";
const JOURNAL_TOGGLE_PAD = 4;
const DETAILS_ICON_COLOR = "#93C5FD";

interface MoodEntry {
  id: string;
  emotions: Array<{ emotion: string; confidence: number; color: string }>;
  duration_in_minutes?: number;
  energy_level: number;
  stress_level: number;
  sleep_quality?: "poor" | "fair" | "good" | number;
  notes: string;
  log_date: Date | string;
  created_at?: Date | string;
  event_tags?: string[];
  event_categories?: string[];
  journal_image_url?: string;
  bath_taken?: boolean;
  meal_responses?: Array<{
    meal_id: string;
    meal_label: string;
    meal_time: string;
    taken: boolean;
  }>;
}

/** Counselor baseline policy: date, time, mood only — strip fields not shown in UI. */
function sanitizeEntryForCounselorBaseline(entry: MoodEntry): MoodEntry {
  const emotions = Array.isArray(entry.emotions) ? entry.emotions : [];
  return {
    ...entry,
    emotions,
    notes: "",
    /** Hide self-report scales from UI paths that still receive raw subscription payloads. */
    stress_level: 1,
    energy_level: 10,
    sleep_quality: undefined,
    journal_image_url: "",
    bath_taken: false,
    meal_responses: [],
    duration_in_minutes: undefined,
    event_tags: [],
    event_categories: [],
  };
}

interface CalendarDay {
  date: Date;
  logs: MoodLog[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

function mapEmotionToMoodLog(emotionName: string): MoodLog["mood"] {
  const normalized = emotionName?.toLowerCase().trim();
  if (
    normalized === "happy" ||
    normalized === "joy" ||
    normalized === "happiness"
  )
    return "Happy";
  if (normalized === "sad" || normalized === "sadness") return "Sad";
  if (normalized === "angry" || normalized === "anger") return "Angry";
  if (normalized === "surprise" || normalized === "surprised")
    return "Surprise";
  if (normalized === "neutral") return "Neutral";
  return "Neutral";
}

function confidenceToIntensity(confidence: number): number {
  const raw = typeof confidence === "number" ? confidence : 0;
  return Math.max(1, Math.min(5, Math.round(raw * 5)));
}

function toMoodLogs(dayEntries: MoodEntry[]): MoodLog[] {
  const logs: MoodLog[] = [];
  dayEntries.forEach((entry, entryIndex) => {
    const emotions = Array.isArray(entry.emotions) ? entry.emotions : [];
    const rawNotes = typeof entry.notes === "string" ? entry.notes.trim() : "";
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

function localCalendarKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateSafe(input: Date | string | undefined): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string") return new Date(input);
  return new Date();
}

function formatTime(input: Date | string | undefined): string {
  const d = toDateSafe(input);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDurationShort(minutes: number | undefined): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0)
    return "N/A";
  return `${Math.round(minutes)} min`;
}

function formatMealTimeToAmPm(time: string): string {
  const [hRaw, mRaw] = (time || "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const clampedHour = Math.max(0, Math.min(23, h));
  const clampedMinute = Math.max(0, Math.min(59, m));
  const period = clampedHour >= 12 ? "PM" : "AM";
  const hour12 = clampedHour % 12 || 12;
  return `${hour12}:${String(clampedMinute).padStart(2, "0")} ${period}`;
}

function sleepQualityLabel(raw: MoodEntry["sleep_quality"]): string {
  if (raw === "good") return "Good";
  if (raw === "fair") return "Fair";
  if (raw === "poor") return "Poor";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 2) return "Poor";
    if (raw === 3) return "Fair";
    if (raw >= 4) return "Good";
  }
  return "Not logged";
}

function formatTagLabel(tag: string): string {
  return tag.replace(/-/g, " ");
}

function formatCategoryLabel(category: string): string {
  if (category === "fun") return "Fun / Leisure";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const MOOD_ICON_BY_MOOD: Record<MoodLog["mood"], ImageSourcePropType> = {
  Happy: require("../../assets/moodIcon/happy.png"),
  Sad: require("../../assets/moodIcon/sad.png"),
  Angry: require("../../assets/moodIcon/angry.png"),
  Surprise: require("../../assets/moodIcon/surprise.png"),
  Neutral: require("../../assets/moodIcon/neutral.png"),
};

function MoodIcon({ mood, size = 16 }: { mood: MoodLog["mood"]; size?: number }) {
  return (
    <Image
      source={MOOD_ICON_BY_MOOD[mood]}
      style={{ width: size, height: size }}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
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
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dayCell,
        hasLog && {
          backgroundColor: blended,
          shadowColor: blended,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 6,
          elevation: 6,
        },
        isSelected && styles.selectedRing,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          hasLog && { color: "#ffffff", fontWeight: "700" },
          !hasLog && { color: "#64748b" },
        ]}
      >
        {dayNumber}
      </Text>
    </TouchableOpacity>
  );
}

function CounselorDayDetailCard({
  dateLabel,
  entries,
  privacyMode = "full",
}: {
  dateLabel: string;
  entries: MoodEntry[];
  privacyMode?: "baseline" | "full";
}) {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedEntryId(null);
  }, [dateLabel]);

  const logs = toMoodLogs(entries);
  const blended = blendMoodColors(logs);
  const explanation = generateExplanation(logs);
  const hasLog = logs.length > 0;
  const sorted = [...entries].sort(
    (a, b) =>
      toDateSafe(b.created_at || b.log_date).getTime() -
      toDateSafe(a.created_at || a.log_date).getTime(),
  );

  return (
    <View style={styles.detailCard}>
      {hasLog && (
        <View
          style={{
            height: 6,
            borderRadius: 6,
            backgroundColor: blended,
            marginBottom: 14,
          }}
        />
      )}
      <Text style={styles.detailDate}>{dateLabel}</Text>
      {!hasLog ? (
        <Text style={styles.detailEmpty}>No mood logged on this day.</Text>
      ) : (
        <>
          {sorted.map((entry, idx) => {
            const group = toMoodLogs([entry]);
            const noteText =
              typeof entry.notes === "string" ? entry.notes.trim() : "";
            const journalUrl =
              typeof entry.journal_image_url === "string"
                ? entry.journal_image_url.trim()
                : "";
            const bathTaken = !!entry.bath_taken;
            const mealResponses = Array.isArray(entry.meal_responses)
              ? entry.meal_responses
              : [];
            const durationMinutes =
              typeof entry.duration_in_minutes === "number" &&
              Number.isFinite(entry.duration_in_minutes) &&
              entry.duration_in_minutes > 0
                ? Math.round(entry.duration_in_minutes)
                : undefined;
            const energyLevelRaw =
              typeof entry.energy_level === "number" &&
              Number.isFinite(entry.energy_level)
                ? entry.energy_level
                : null;
            const stressLevelRaw =
              typeof entry.stress_level === "number" &&
              Number.isFinite(entry.stress_level)
                ? entry.stress_level
                : null;
            const energyLevel =
              energyLevelRaw === null
                ? null
                : energyLevelRaw > 5
                  ? Math.round(energyLevelRaw / 2)
                  : energyLevelRaw;
            const stressLevel =
              stressLevelRaw === null
                ? null
                : stressLevelRaw > 5
                  ? Math.round(stressLevelRaw / 2)
                  : stressLevelRaw;
            const tags = Array.isArray(entry.event_tags) ? entry.event_tags : [];
            const categoriesFromEntry = Array.isArray(entry.event_categories)
              ? entry.event_categories
              : [];
            const categories =
              categoriesFromEntry.length > 0
                ? categoriesFromEntry
                : [];
            const groupKey = entry.id || `e-${idx}`;
            const expanded = expandedEntryId === groupKey;

            return (
              <TouchableOpacity
                key={groupKey}
                activeOpacity={0.88}
                onPress={() => {
                  if (privacyMode !== "full") return;
                  setExpandedEntryId((prev) =>
                    prev === groupKey ? null : groupKey,
                  );
                }}
                style={styles.entryBlock}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTime}>
                    {formatTime(entry.created_at || entry.log_date)}
                  </Text>
                  {privacyMode === "full" ? (
                    <Text style={styles.entryHint}>
                      {expanded ? "Hide details" : "Tap for details"}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.chipsRow}>
                  {group.map((log, i) => (
                    <View
                      key={`${groupKey}-m-${i}`}
                      style={[
                        styles.chip,
                        { backgroundColor: MOOD_COLORS[log.mood] + "25" },
                      ]}
                    >
                      <MoodIcon mood={log.mood} size={14} />
                      <Text
                        style={[styles.chipLabel, { color: MOOD_COLORS[log.mood] }]}
                      >
                        {log.mood}
                      </Text>
                      {privacyMode === "full" ? (
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
                                      : "#ffffff15",
                                },
                              ]}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                {expanded && privacyMode === "full" ? (
                  <>
                    <View style={styles.detailsBlock}>
                      <View style={styles.detailsSection}>
                        <View style={styles.detailsSectionHeader}>
                          <Timer size={14} color={DETAILS_ICON_COLOR} />
                          <Text style={styles.noteLabel}>Mood duration</Text>
                        </View>
                        <View style={styles.detailsAnswerWrap}>
                          <Text style={styles.detailsLine}>
                            <Text style={styles.detailValueAccent}>
                              {formatDurationShort(durationMinutes)}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailsSection}>
                        <View style={styles.detailsSectionHeader}>
                          <BarChart3 size={14} color={DETAILS_ICON_COLOR} />
                          <Text style={styles.noteLabel}>Energy & stress</Text>
                        </View>
                        <View style={styles.detailsAnswerWrap}>
                          <Text style={styles.detailsLine}>
                            Energy level:{" "}
                            <Text style={styles.detailValueAccent}>
                              {energyLevel === null ? "--" : `${energyLevel}/5`}
                            </Text>
                          </Text>
                          <Text style={styles.detailsLine}>
                            Stress level:{" "}
                            <Text style={styles.detailValueAccent}>
                              {stressLevel === null ? "--" : `${stressLevel}/5`}
                            </Text>
                          </Text>
                          <Text style={styles.detailsLine}>
                            Sleep quality:{" "}
                            <Text style={styles.detailValueAccent}>
                              {sleepQualityLabel(entry.sleep_quality)}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailsSection}>
                        <View style={styles.detailsSectionHeader}>
                          <Bath size={14} color={DETAILS_ICON_COLOR} />
                          <Text style={styles.noteLabel}>Bath</Text>
                        </View>
                        <View style={styles.detailsAnswerWrap}>
                          <Text style={styles.detailsLine}>
                            <Text style={styles.detailValueAccent}>
                              {bathTaken ? "Taken" : "Not yet"}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailsSection}>
                        <View style={styles.detailsSectionHeader}>
                          <UtensilsCrossed size={14} color={DETAILS_ICON_COLOR} />
                          <Text style={styles.noteLabel}>
                            Meal x{mealResponses.length}
                          </Text>
                        </View>
                        {mealResponses.length > 0 ? (
                          <View style={[styles.detailsAnswerWrap, { gap: 3 }]}>
                            {mealResponses.map((meal, mealIdx) => (
                              <Text
                                key={`${groupKey}-meal-${mealIdx}`}
                                style={styles.detailsLine}
                              >
                                {meal.meal_label} (
                                {formatMealTimeToAmPm(meal.meal_time)}):{" "}
                                <Text style={styles.detailValueAccent}>
                                  {meal.taken ? "Taken" : "Not yet"}
                                </Text>
                              </Text>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.detailsAnswerWrap}>
                            <Text style={styles.detailsLine}>
                              <Text style={styles.inlineNone}>
                                No meal schedule response
                              </Text>
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.detailsSection}>
                        <View style={styles.detailsSectionHeader}>
                          <Tags size={14} color={DETAILS_ICON_COLOR} />
                          <Text style={styles.noteLabel}>Context</Text>
                        </View>
                        <View style={styles.detailsAnswerWrap}>
                          <Text
                            style={[
                              styles.detailsLine,
                              { marginBottom: tags.length > 0 ? 4 : 0 },
                            ]}
                          >
                            Events:
                            {tags.length === 0 ? (
                              <Text style={styles.inlineNone}> None</Text>
                            ) : null}
                          </Text>
                          {tags.length > 0 ? (
                            <View style={styles.eventPillRow}>
                              {tags.map((tag) => (
                                <View
                                  key={`${groupKey}-${tag}`}
                                  style={styles.eventPill}
                                >
                                  <Text style={styles.eventPillText}>
                                    {formatTagLabel(tag)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          <Text
                            style={[
                              styles.detailsLine,
                              {
                                marginTop: 8,
                                marginBottom: categories.length > 0 ? 4 : 0,
                              },
                            ]}
                          >
                            Categories:
                            {categories.length === 0 ? (
                              <Text style={styles.inlineNone}> None</Text>
                            ) : null}
                          </Text>
                          {categories.length > 0 ? (
                            <View style={styles.eventPillRow}>
                              {categories.map((category) => (
                                <View
                                  key={`${groupKey}-category-${category}`}
                                  style={styles.eventPill}
                                >
                                  <Text style={styles.eventPillText}>
                                    {formatCategoryLabel(category)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailsSection}>
                      <View style={styles.detailsSectionHeader}>
                        <NotebookPen size={14} color={DETAILS_ICON_COLOR} />
                        <Text style={styles.noteLabel}>Note</Text>
                      </View>
                      <View style={styles.detailsAnswerWrap}>
                        <Text style={noteText ? styles.noteBody : styles.noteBodyEmpty}>
                          {noteText || "No notes"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.journalImageBlock}>
                      <View style={styles.detailsSectionHeader}>
                        <ImageIcon size={14} color={DETAILS_ICON_COLOR} />
                        <Text style={styles.noteLabel}>Photo</Text>
                      </View>
                      {journalUrl ? (
                        <Image
                          source={{ uri: journalUrl }}
                          style={styles.journalImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.detailsAnswerWrap}>
                          <Text style={styles.noteBodyEmpty}>No photo</Text>
                        </View>
                      )}
                    </View>
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
          {privacyMode === "full" ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

type Tab = "calendar" | "analytics";

interface Props {
  studentId: string;
  analyticsSlot: React.ReactNode;
  /** baseline = date, time, mood only; full = notes, sleep, meals, charts tab, etc. */
  privacyMode?: "baseline" | "full";
}

export function CounselorStudentJournalCalendar({
  studentId,
  analyticsSlot,
  privacyMode = "full",
}: Props) {
  const reduceMotion = useReducedMotion();
  const showAnalyticsTab =
    privacyMode === "full" && analyticsSlot != null;
  const [tab, setTab] = useState<Tab>("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [trackW, setTrackW] = useState(0);
  const thumbX = useSharedValue(0);
  const thumbW = useSharedValue(0);
  const thumbStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: JOURNAL_TOGGLE_PAD,
    bottom: JOURNAL_TOGGLE_PAD,
    left: JOURNAL_TOGGLE_PAD,
    width: thumbW.value,
    transform: [{ translateX: thumbX.value }],
    backgroundColor: AURORA.blue,
    borderRadius: 12,
  }));

  useEffect(() => {
    if (!showAnalyticsTab) {
      setTab("calendar");
    }
  }, [showAnalyticsTab]);

  useEffect(() => {
    if (trackW <= 0 || !showAnalyticsTab) return;
    const inner = trackW - JOURNAL_TOGGLE_PAD * 2;
    const seg = inner / 2;
    const idx = tab === "calendar" ? 0 : 1;
    const dur = reduceMotion ? 0 : 240;
    const easing = Easing.out(Easing.cubic);
    thumbX.value = withTiming(idx * seg, { duration: dur, easing });
    thumbW.value = withTiming(seg, { duration: dur, easing });
  }, [tab, trackW, reduceMotion, thumbX, thumbW, showAnalyticsTab]);

  useEffect(() => {
    if (!studentId) {
      setMoodData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
    end.setHours(23, 59, 59, 999);
    const unsub = moodService.subscribeMoodLogs(
      studentId,
      (data) => {
        const arr = Array.isArray(data) ? (data as MoodEntry[]) : [];
        setMoodData(
          privacyMode === "baseline"
            ? arr.map(sanitizeEntryForCounselorBaseline)
            : arr,
        );
        setLoading(false);
      },
      start.toISOString(),
      end.toISOString(),
      () => {
        setMoodData([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [currentDate, studentId, privacyMode]);

  const calendarDays = useMemo(() => {
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
      const dayMoods = moodData.filter((m) => {
        if (!m?.log_date) return false;
        const logDate =
          m.log_date instanceof Date ? m.log_date : new Date(m.log_date);
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
  }, [moodData, currentDate]);

  const dayDetailsEntries = useMemo(() => {
    if (!selectedDay) return [] as MoodEntry[];
    const selectedKey = localCalendarKey(selectedDay.date);
    return moodData.filter((m) => {
      if (!m?.log_date) return false;
      const d = m.log_date instanceof Date ? m.log_date : new Date(m.log_date);
      return localCalendarKey(d) === selectedKey;
    });
  }, [moodData, selectedDay]);

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View>
      {showAnalyticsTab ? (
      <View
        style={{
          backgroundColor: AURORA.cardAlt,
          borderRadius: 14,
          padding: JOURNAL_TOGGLE_PAD,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: AURORA.border,
          position: "relative",
          overflow: "hidden",
        }}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      >
        <Animated.View pointerEvents="none" style={thumbStyle} />
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => setTab("calendar")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <BookMarked
              size={18}
              color={tab === "calendar" ? "#FFF" : UI_TEXT_MUTED}
            />
            <Text
              style={{
                color: tab === "calendar" ? "#FFF" : UI_TEXT_MUTED,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Journal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("analytics")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <BarChart3
              size={18}
              color={tab === "analytics" ? "#FFF" : UI_TEXT_MUTED}
            />
            <Text
              style={{
                color: tab === "analytics" ? "#FFF" : UI_TEXT_MUTED,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

      {tab === "analytics" && showAnalyticsTab ? (
        analyticsSlot
      ) : loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color={AURORA.blue} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 24,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setCurrentDate((p) => {
                    const d = new Date(p);
                    d.setMonth(d.getMonth() - 1);
                    return d;
                  })
                }
                style={{ padding: 8 }}
              >
                <ChevronLeft size={20} color={AURORA.textSec} />
              </TouchableOpacity>
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
                {monthLabel}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setCurrentDate((p) => {
                    const d = new Date(p);
                    d.setMonth(d.getMonth() + 1);
                    return d;
                  })
                }
                style={{ padding: 8 }}
              >
                <ChevronRight size={20} color={AURORA.textSec} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {weekDays.map((d, i) => (
                <Text
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: UI_TEXT_MUTED,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarDays.map((day) => {
                const isSelected =
                  selectedDay?.date.toDateString() === day.date.toDateString();
                const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
                return (
                  <View
                    key={dayKey}
                    style={{
                      width: "14.28%",
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
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
          </View>

          {selectedDay ? (
            <CounselorDayDetailCard
              dateLabel={selectedDay.date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              entries={dayDetailsEntries}
              privacyMode={privacyMode}
            />
          ) : (
            <View style={styles.hintBox}>
              <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 14 }}>
                {privacyMode === "baseline"
                  ? "Tap a colored day to see time and mood for each check-in on that date."
                  : "Tap a colored day to see journal entries for that date."}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  selectedRing: {
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loaderBox: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  hintBox: {
    backgroundColor: AURORA.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginBottom: 40,
  },
  detailCard: {
    backgroundColor: "#0f1f3d",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  detailDate: {
    color: AURORA.blue,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailEmpty: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  entryBlock: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  entryTime: {
    color: AURORA.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  entryHint: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  intensityRow: {
    flexDirection: "row",
    gap: 3,
    marginLeft: 4,
  },
  intensityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  detailsBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.2)",
  },
  detailsSection: {
    marginTop: 8,
  },
  detailsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  detailsAnswerWrap: {
    marginLeft: 20,
    marginTop: 2,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(147,197,253,0.22)",
  },
  detailsTitle: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  detailsLine: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  inlineNone: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  healthValue: {
    color: "#BBF7D0",
    fontWeight: "700",
  },
  detailValueAccent: {
    color: "#BBF7D0",
    fontWeight: "700",
  },
  eventPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  eventPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.35)",
    backgroundColor: "rgba(99,102,241,0.12)",
  },
  eventPillText: {
    color: "#c4b5fd",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  journalImageBlock: {
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  noteLabel: {
    color: AURORA.blue,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  noteBody: {
    color: "#e2e8f0",
    fontSize: 13,
    lineHeight: 20,
  },
  noteBodyEmpty: {
    color: "#94a3b8",
    fontSize: 13,
    fontStyle: "italic",
  },
  journalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginTop: 8,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  explanationBox: {
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  explanationText: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
