import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, ScrollView, TouchableOpacity, Image, Modal, Platform, ActivityIndicator, StyleSheet, Alert, Animated, Easing } from "react-native";
import { AppText as Text } from "../../components/common/AppText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TrendingUp,
  Lightbulb,
  Flame,
  Camera,
  MessageSquare,
  BookOpen,
  X,
  CalendarPlus,
  ScanFace,
  CircleHelp,
  CalendarClock,
  Trash2,
  MapPinned,
} from "lucide-react-native";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../stores/AuthContext";
import { router, useFocusEffect } from "expo-router";
import { moodService } from "../../services/mood.service";
import type { MoodData } from "../../services/firebase-firestore.service";
import { firestoreService } from "../../services/firebase-firestore.service";
import { db } from "../../services/firebase";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../../components/common/LetterAvatar";
import { MoodCheckIn } from "../../components/MoodCheckIn";
import DashboardSessionRequestModal from "../../components/student/DashboardSessionRequestModal";
import { AnnouncementSection } from "../../components/announcements/AnnouncementSection";
import { triggerHaptic } from "../../utils/haptics";
import {
  calculateStressLevel,
  classifyStress,
  energyLevelToMoodScale,
  getDailyFeedback,
} from "../../utils/analytics/ethicsDailyAnalytics";
import {
  moodCategoryFromFive,
  stressCategoryFromFive,
  energyCategoryFromFive,
} from "../../utils/analytics/metricCategories";
import { getEmotionLabel } from "../../utils/moodColors";
import { calculateCheckInStreak } from "../../utils/analytics/dateKeys";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import { moodLogsToMoodEntries } from "../../utils/moodEntryNormalize";
import { aggregateByDay, moodStabilityScore } from "../../utils/moodAggregates";
import {
  getUserSettings,
  updateUserSettings,
} from "../../services/mood-firestore-v2.service";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../components/common/InfoGuideModal";
import {
  SpotlightTourOverlay,
  type SpotlightTourStep,
} from "../../components/tours/SpotlightTourOverlay";
import {
  isStudentHomeTourCompleted,
  markStudentHomeTourCompleted,
} from "../../services/student-home-tour.storage";
import { COUNSELOR_CHECKIN_WINDOW_DAYS } from "../../constants/counselor-checkin-policy";
import {
  getConfirmedFinalSlot,
} from "../../utils/sessionScheduling";
import {
  isSessionDocOpenRequestExpired24h,
  parseSlotToDate,
} from "../../utils/dateHelpers";

// ─── Student sessions overview (dashboard sheet) ─────────────────────────────
const STUDENT_SESSION_CLOSED = new Set([
  "completed",
  "missed",
  "cancelled",
  "expired",
]);

type StudentSessionDashboardBucket =
  | "agreed"
  | "past_agreed"
  | "action"
  | "closed"
  | "other";

interface StudentSessionOverviewRow {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorAvatarUrl?: string;
  status: string;
  summaryLine: string;
  chipLabel: string;
  updatedAt: Date;
  dashboardBucket: StudentSessionDashboardBucket;
  /** Agreed slot when set — used for "right now" vs past chip. */
  lockedSlot: { date: string; time: string } | null;
  /** For sorting agreed sessions (soonest appointment first). */
  scheduledSortMs: number;
}

function firestoreTsToDateStudent(v: unknown): Date {
  if (
    v != null &&
    typeof v === "object" &&
    typeof (v as { toDate?: () => Date }).toDate === "function"
  ) {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

/** How long after the agreed start we still treat the session as in progress (student "My sessions"). */
const STUDENT_SESSION_ACTIVE_WINDOW_MS = 90 * 60 * 1000;

function lockedAgreedSlotStartMs(
  slot: { date: string; time: string } | null,
): number | null {
  if (!slot?.date) return null;
  const parsed = parseSlotToDate({
    date: slot.date,
    time: slot.time ?? "",
  });
  if (!parsed || isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

/** Start time has passed but we are still within the session window → not a "past" appointment yet. */
function isStudentSessionSlotActiveNow(
  slot: { date: string; time: string } | null,
  nowMs: number = Date.now(),
): boolean {
  const startMs = lockedAgreedSlotStartMs(slot);
  if (startMs == null) return false;
  return (
    nowMs >= startMs && nowMs < startMs + STUDENT_SESSION_ACTIVE_WINDOW_MS
  );
}

function studentSessionDashboardBucket(params: {
  status: string;
  lockedSlot: { date: string; time: string } | null;
}): StudentSessionDashboardBucket {
  const st = params.status.toLowerCase();
  if (STUDENT_SESSION_CLOSED.has(st)) return "closed";
  if (params.lockedSlot) {
    const startMs = lockedAgreedSlotStartMs(params.lockedSlot);
    if (startMs == null) return "past_agreed";
    const now = Date.now();
    if (startMs > now) return "agreed";
    if (isStudentSessionSlotActiveNow(params.lockedSlot, now)) return "agreed";
    return "past_agreed";
  }
  if (["requested", "pending", "needs_rescheduling"].includes(st)) {
    return "action";
  }
  return "other";
}

function studentSessionChipLabelForBucket(row: StudentSessionOverviewRow): string {
  const st = row.status.toLowerCase();
  switch (row.dashboardBucket) {
    case "agreed":
      if (st === "rescheduled") return "Rescheduled";
      if (row.lockedSlot && isStudentSessionSlotActiveNow(row.lockedSlot)) {
        return "Today";
      }
      return "Upcoming counseling";
    case "past_agreed":
      return "Past appointment";
    case "action":
      if (st === "pending") return "Counselor invite";
      if (st === "requested") return "Awaiting counselor";
      if (st === "needs_rescheduling") return "Reschedule needed";
      return studentSessionChipLabel(st);
    case "closed":
    default:
      return studentSessionChipLabel(st);
  }
}

function studentSessionChipLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "requested":
      return "Awaiting counselor";
    case "pending":
      return "Pick a time";
    case "needs_rescheduling":
      return "Reschedule";
    case "confirmed":
      return "Confirmed";
    case "rescheduled":
      return "Rescheduled";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status || "Session";
  }
}

function formatStudentSessionTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const hiddenStudentSessionsStorageKey = (studentId: string) =>
  `aurora.studentSessionsOverview.hidden:${studentId}`;

async function loadHiddenStudentSessionIds(
  studentId: string,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(
      hiddenStudentSessionsStorageKey(studentId),
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

async function saveHiddenStudentSessionIds(
  studentId: string,
  ids: string[],
): Promise<void> {
  await AsyncStorage.setItem(
    hiddenStudentSessionsStorageKey(studentId),
    JSON.stringify(ids),
  );
}

async function fetchStudentSessionsOverview(
  studentId: string,
): Promise<StudentSessionOverviewRow[]> {
  const raw = await firestoreService.getSessionsForStudent(studentId);
  const counselorIds = [
    ...new Set(
      raw
        .map((s) => String((s as Record<string, unknown>).counselorId ?? ""))
        .filter(Boolean),
    ),
  ];
  const nameMap: Record<string, string> = {};
  const avatarMap: Record<string, string> = {};
  await Promise.all(
    counselorIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "users", id));
        const u = snap.data();
        nameMap[id] = String(
          u?.full_name ?? u?.preferred_name ?? u?.fullName ?? "Counselor",
        );
        avatarMap[id] =
          typeof u?.avatar_url === "string" ? u.avatar_url.trim() : "";
      } catch {
        nameMap[id] = "Counselor";
        avatarMap[id] = "";
      }
    }),
  );

  return raw
    .flatMap((s) => {
      const rec = s as Record<string, unknown> & { id: string };
      const cid = String(rec.counselorId ?? "");
      const status = String(rec.status ?? "").toLowerCase();
      const updatedAt = firestoreTsToDateStudent(rec.updatedAt);

      if (
        status === "requested" &&
        isSessionDocOpenRequestExpired24h({
          status,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        })
      ) {
        return [];
      }

      const lockedSlot = getConfirmedFinalSlot(
        rec as { finalSlot?: unknown; confirmedSlot?: unknown },
      );

      const proposedLen = Array.isArray(rec.proposedSlots)
        ? rec.proposedSlots.length
        : 0;

      let summaryLine = "Open Messages for details";
      if (lockedSlot?.date) {
        summaryLine = `${lockedSlot.date}${lockedSlot.time ? ` · ${lockedSlot.time}` : ""}`;
      } else if (status === "pending" && proposedLen > 0) {
        summaryLine = `${proposedLen} proposed time${proposedLen === 1 ? "" : "s"} — confirm in Messages`;
      } else if (
        typeof rec.preferredTimeFromStudent === "string" &&
        rec.preferredTimeFromStudent.trim()
      ) {
        summaryLine = rec.preferredTimeFromStudent.trim();
      }

      const dashboardBucket = studentSessionDashboardBucket({
        status,
        lockedSlot,
      });

      let scheduledSortMs = updatedAt.getTime();
      if (lockedSlot) {
        const parsed = parseSlotToDate({
          date: lockedSlot.date,
          time: lockedSlot.time ?? "",
        });
        scheduledSortMs =
          parsed && !isNaN(parsed.getTime())
            ? parsed.getTime()
            : Number.MAX_SAFE_INTEGER;
      }

      const baseRow: StudentSessionOverviewRow = {
        id: String(rec.id ?? ""),
        counselorId: cid,
        counselorName: nameMap[cid] ?? "Counselor",
        counselorAvatarUrl: avatarMap[cid] ?? "",
        status,
        summaryLine,
        chipLabel: "",
        updatedAt,
        dashboardBucket,
        lockedSlot,
        scheduledSortMs,
      };
      baseRow.chipLabel = studentSessionChipLabelForBucket(baseRow);
      return [baseRow];
    })
    .filter((row) => row.id.length > 0 && row.counselorId.length > 0)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// ─── Mood Emotion Data ──────────────────────────────────────────────────────
const MOOD_EMOTIONS = [
  {
    name: "joy",
    label: "Happy",
    color: AURORA.moodHappy,
    icon: require("../../assets/moodIcon/happy.png"),
  },
  {
    name: "sadness",
    label: "Sad",
    color: AURORA.moodSad,
    icon: require("../../assets/moodIcon/sad.png"),
  },
  {
    name: "neutral",
    label: "Neutral",
    color: AURORA.moodNeutral,
    icon: require("../../assets/moodIcon/neutral.png"),
  },
  {
    name: "surprise",
    label: "Surprise",
    color: AURORA.moodSurprise,
    icon: require("../../assets/moodIcon/surprise.png"),
  },
  {
    name: "anger",
    label: "Angry",
    color: AURORA.moodAngry,
    icon: require("../../assets/moodIcon/angry.png"),
  },
];

const UI_TEXT_SECONDARY = "#C1CEE9";
const UI_TEXT_MUTED = "#9AA9C8";
const UI_SCREEN_PADDING = 18;
const UI_SECTION_GAP = 14;

// ─── Mood Bubble ─────────────────────────────────────────────────────────────
function MoodBubble({
  mood,
  selected,
  onPress,
}: {
  mood: (typeof MOOD_EMOTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        triggerHaptic("light");
        onPress();
      }}
      activeOpacity={0.8}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      style={{ alignItems: "center", gap: 8, minWidth: 62 }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: mood.color,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: selected ? 3 : 0,
          borderColor: "#FFFFFF",
          shadowColor: mood.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: selected ? 0.7 : 0,
          shadowRadius: 10,
          elevation: selected ? 8 : 0,
        }}
      >
        <Image
          source={mood.icon}
          style={{ width: 38, height: 38 }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={{
          color: selected ? "#FFFFFF" : UI_TEXT_SECONDARY,
          fontSize: 12,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {mood.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Quick Action Tile ────────────────────────────────────────────────────────
function QuickActionTile({
  label,
  icon,
  wide,
  badge,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  wide?: boolean;
  badge?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        triggerHaptic("light");
        onPress?.();
      }}
      activeOpacity={0.75}
      style={{
        flex: wide ? 2 : 1,
        backgroundColor: AURORA.card,
        borderRadius: 18,
        padding: 11,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 78,
        borderWidth: 1,
        borderColor: AURORA.border,
        position: "relative",
      }}
    >
      <View
        style={{
          marginBottom: 4,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 2,
        }}
      >
        {icon}
      </View>
      {badge && (
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          {badge}
        </View>
      )}
      <Text
        style={{
          color: UI_TEXT_SECONDARY,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.4,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
function StreakCard({ streak }: { streak: number }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: AURORA.card,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: AURORA.textMuted,
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 0.8,
          }}
        >
          STREAK
        </Text>
        {/* <View style={{ backgroundColor: 'rgba(249,115,22,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#FDBA74', fontSize: 9, fontWeight: '700' }}>Active</Text>
                </View> */}
      </View>
      <Flame size={22} color="#FB923C" style={{ marginBottom: 8 }} />
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 24,
          fontWeight: "900",
          lineHeight: 26,
        }}
      >
        {streak}
      </Text>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: "700",
          marginTop: 1,
        }}
      >
        Days
      </Text>
      {/* <Text
        style={{
          color: UI_TEXT_SECONDARY,
          fontSize: 10,
          marginTop: 4,
          lineHeight: 14,
        }}
      >
        Keep checking in daily to grow this streak.
      </Text> */}
    </View>
  );
}

// ─── AI Insight Card ─────────────────────────────────────────────────────────
function AIInsightCard({ insight }: { insight: string }) {
  return (
    <View
      style={{
        backgroundColor: AURORA.card,
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 16,
      }}
    >
      <Lightbulb size={24} color="#C4B5FD" style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          Daily note
        </Text>
        <Text
          style={{ color: UI_TEXT_SECONDARY, fontSize: 13, lineHeight: 19 }}
        >
          {insight}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MoodLogScreen() {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeGuide, setActiveGuide] = useState<InfoGuideContent | null>(null);
  const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
  const [sessionsSheetOpen, setSessionsSheetOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [studentSessionsOverview, setStudentSessionsOverview] = useState<
    StudentSessionOverviewRow[]
  >([]);
  /** Session doc ids hidden from My sessions only (device-local; Firestore unchanged). */
  const [hiddenSessionIds, setHiddenSessionIds] = useState<string[]>([]);
  const [showCheckInSharingBriefing, setShowCheckInSharingBriefing] =
    useState(false);
  const [sharingBriefingLoaded, setSharingBriefingLoaded] = useState(false);
  const [showStudentHomeTour, setShowStudentHomeTour] = useState(false);

  const tourWelcomeBlockRef = useRef<View>(null);
  const tourMoodCardRef = useRef<View>(null);
  const tourSessionsBtnRef = useRef<View>(null);
  const tourQuickActionsRef = useRef<View>(null);
  const tourReplayGlowPhase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tourReplayGlowPhase, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tourReplayGlowPhase, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      tourReplayGlowPhase.setValue(0);
    };
  }, [tourReplayGlowPhase]);

  const tourReplayGlowRingStyle = useMemo(
    () => ({
      opacity: tourReplayGlowPhase.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.6],
      }),
      transform: [
        {
          scale: tourReplayGlowPhase.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1],
          }),
        },
      ],
    }),
    [tourReplayGlowPhase],
  );

  const studentHomeTourSteps = useMemo<SpotlightTourStep[]>(
    () => [
      {
        title: "Welcome home",
        body: "This short tour highlights the main areas on your Home screen. Tap Next to continue, or Skip tour if you prefer to explore on your own.",
      },
      {
        title: "Your welcome area",
        body: "Your avatar and name show here so you always know you are on your own Home tab.",
        targetRef: tourWelcomeBlockRef,
        padding: 10,
      },
      {
        title: "Mood check-in",
        body: "Tap a face to log how you feel. Regular check-ins power your streak, stability, and daily note on this screen.",
        targetRef: tourMoodCardRef,
        padding: 10,
      },
      {
        title: "My sessions",
        body: "Open this calendar to see upcoming appointments, counselor invites, and anything that still needs your action.",
        targetRef: tourSessionsBtnRef,
        padding: 12,
      },
      {
        title: "Quick shortcuts",
        body: "Request a counseling session, open Messages, or browse Zen resources without hunting through menus.",
        targetRef: tourQuickActionsRef,
        padding: 8,
      },
      {
        title: "Move around the app",
        body: "Use the bottom bar for Journal, Messages, Zen, and Profile. Replay this tour anytime from the map icon beside Welcome back.",
      },
    ],
    [],
  );
  const [stats, setStats] = useState({
    streak: 0,
    todayStability: 0,
    todayCount: 0,
  });
  const [insight, setInsight] = useState(
    "Complete a check-in for a short note based on your mood and tasks (no AI on this screen).",
  );

  const firstName = user?.full_name?.split(" ")[0] || "Student";

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStudentSessionsOverview = useCallback(async () => {
    if (!user?.id) return;
    setSessionsLoading(true);
    try {
      const rows = await fetchStudentSessionsOverview(user.id);
      setStudentSessionsOverview(rows);
    } catch {
      setStudentSessionsOverview([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadStudentSessionsOverview();
    }, [loadStudentSessionsOverview]),
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void loadHiddenStudentSessionIds(user.id).then((ids) => {
      if (!cancelled) setHiddenSessionIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setSharingBriefingLoaded(false);
      return;
    }
    let cancelled = false;
    setSharingBriefingLoaded(false);
    (async () => {
      try {
        const s = await getUserSettings(user.id);
        if (!cancelled && !s.checkInSharingBriefingSeen) {
          setShowCheckInSharingBriefing(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSharingBriefingLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const endStudentHomeTour = useCallback(
    async (markCompleted: boolean) => {
      setShowStudentHomeTour(false);
      if (markCompleted && user?.id) {
        try {
          await markStudentHomeTourCompleted(user.id);
        } catch {
          /* ignore */
        }
      }
    },
    [user?.id],
  );

  const replayStudentHomeTour = useCallback(() => {
    triggerHaptic("light");
    setShowStudentHomeTour(true);
  }, []);

  useEffect(() => {
    if (!user?.id || !sharingBriefingLoaded) return;
    if (showCheckInSharingBriefing) return;
    let cancelled = false;
    (async () => {
      try {
        if (await isStudentHomeTourCompleted(user.id)) return;
      } catch {
        return;
      }
      await new Promise((r) => setTimeout(r, 450));
      if (!cancelled) setShowStudentHomeTour(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, sharingBriefingLoaded, showCheckInSharingBriefing]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const logs = await moodService.getMoodLogs(
        user.id,
        start.toISOString(),
        end.toISOString(),
      );
      if (!logs || logs.length === 0) {
        setStats({
          streak: 0,
          todayStability: 0,
          todayCount: 0,
        });
        setInsight(
          "Complete a check-in for a short note based on your mood and tasks (no AI on this screen).",
        );
        return;
      }
      const streak = calculateCheckInStreak(
        logs as (MoodData & { log_date: Date })[],
        new Date(),
      );
      const dk = calendarDayKeyLocal(new Date());
      const entries = moodLogsToMoodEntries(
        logs as (MoodData & { log_date: Date })[],
      );
      const todayEntries = entries.filter((e) => e.dayKey === dk);
      const todayStability = moodStabilityScore(
        todayEntries.map((e) => e.intensity),
      );
      setStats({
        streak,
        todayStability,
        todayCount: todayEntries.length,
      });
      const todayAgg = aggregateByDay(entries, dk);
      const sorted = [...logs].sort((a: any, b: any) => {
        const da =
          a.log_date instanceof Date ? a.log_date : new Date(a.log_date);
        const db =
          b.log_date instanceof Date ? b.log_date : new Date(b.log_date);
        return db.getTime() - da.getTime();
      });
      const latest = sorted[0] as any;
      const moodScale =
        todayAgg.entryCount > 0
          ? Math.min(5, Math.max(1, Math.round(todayAgg.avgEnergy)))
          : energyLevelToMoodScale(latest?.energy_level ?? 5);
      const latestTags = Array.isArray(latest?.event_tags)
        ? latest.event_tags
        : [];
      const tasks = latestTags.filter((t: string) =>
        [
          "classes",
          "study",
          "quiz",
          "exam",
          "homework",
          "deadline",
          "group-project",
          "presentation",
        ].includes(t),
      ).length;
      const band = classifyStress(calculateStressLevel(moodScale, tasks));
      let line = getDailyFeedback(band, moodScale);
      if (todayAgg.entryCount > 0) {
        const moodOnFive = Math.min(
          5,
          Math.max(1, Math.round(todayAgg.avgIntensity / 2)),
        );
        const dominantLabel = getEmotionLabel(todayAgg.dominantMood);
        const moodCat = moodCategoryFromFive(moodOnFive);
        const stressCat = stressCategoryFromFive(todayAgg.avgStress);
        const energyCat = energyCategoryFromFive(todayAgg.avgEnergy);
        if (todayAgg.entryCount === 1) {
          line =
            `${line} Your dominant emotion was ${dominantLabel}. In that check-in, your mood was ${moodCat}, ` +
            `you were ${stressCat}, and your energy was ${energyCat}.`;
        } else {
          line =
            `${line} Your dominant emotion was ${dominantLabel}. Across ${todayAgg.entryCount} check-ins today, ` +
            `your mood was ${moodCat}, you were ${stressCat}, and your energy level was ${energyCat}.`;
        }
      }
      if (tasks > 0) {
        line = `${line} School context was captured in this check-in.`;
      }
      setInsight(line);
    } catch {
      setStats({
        streak: 0,
        todayStability: 0,
        todayCount: 0,
      });
    }
  };

  const handleMoodTap = (moodName: string) => {
    setSelectedMood(moodName);
    setShowLogModal(true);
  };

  const showStabilityInfo = () => {
    setActiveGuide({
      title: "Today Stability",
      body: "This score summarizes how steady your mood intensity is across today's check-ins. Higher % means more consistent patterns.",
    });
  };

  const hiddenSessionIdSet = useMemo(
    () => new Set(hiddenSessionIds),
    [hiddenSessionIds],
  );

  const visibleStudentSessions = useMemo(
    () =>
      studentSessionsOverview.filter((s) => !hiddenSessionIdSet.has(s.id)),
    [studentSessionsOverview, hiddenSessionIdSet],
  );

  const sessionsRawCount = studentSessionsOverview.length;
  const sessionsVisibleCount = visibleStudentSessions.length;

  const hideSessionCardFromOverview = useCallback(
    (sessionId: string) => {
      triggerHaptic("light");
      setHiddenSessionIds((prev) => {
        if (prev.includes(sessionId)) return prev;
        const next = [...prev, sessionId];
        if (user?.id) void saveHiddenStudentSessionIds(user.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const sessionsAgreedList = [...visibleStudentSessions]
    .filter((s) => s.dashboardBucket === "agreed")
    .sort((a, b) => a.scheduledSortMs - b.scheduledSortMs);

  const sessionsPastAgreedList = [...visibleStudentSessions]
    .filter((s) => s.dashboardBucket === "past_agreed")
    .sort((a, b) => b.scheduledSortMs - a.scheduledSortMs);

  const sessionsActionList = [...visibleStudentSessions]
    .filter((s) => s.dashboardBucket === "action")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const sessionsClosedList = visibleStudentSessions.filter(
    (s) => s.dashboardBucket === "closed",
  );

  const sessionsOtherList = visibleStudentSessions.filter(
    (s) => s.dashboardBucket === "other",
  );

  const pendingSessionsCount = sessionsActionList.length;

  const openSessionsSheet = () => {
    triggerHaptic("light");
    setSessionsSheetOpen(true);
    void loadStudentSessionsOverview();
  };

  const renderSessionOverviewSection = (
    title: string,
    subtitle: string,
    rows: StudentSessionOverviewRow[],
    chipTone: "amber" | "green" | "muted",
    infoBody?: string,
  ) => {
    if (rows.length === 0) return null;
    const chipPalette =
      chipTone === "green"
        ? { bg: "rgba(34,197,94,0.2)", text: AURORA.green }
        : chipTone === "amber"
          ? { bg: "rgba(254,189,3,0.18)", text: AURORA.amber }
          : { bg: "rgba(148,163,184,0.15)", text: AURORA.textMuted };
    const normalizedInfoBody = (infoBody || "").trim();
    return (
      <View style={{ marginBottom: 18 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              color: UI_TEXT_MUTED,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
            }}
          >
            {title}
          </Text>
          {normalizedInfoBody ? (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic("light");
                Alert.alert(title, normalizedInfoBody);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`${title} info`}
              style={{ padding: 4 }}
            >
              <CircleHelp size={16} color={UI_TEXT_MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>
        {!normalizedInfoBody && subtitle.trim() ? (
          <Text
            style={{
              color: AURORA.textSec,
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        {rows.map((row) => (
          <View
            key={row.id}
            style={{
              backgroundColor: AURORA.cardDark,
              borderRadius: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: AURORA.border,
              flexDirection: "row",
              alignItems: "stretch",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                triggerHaptic("light");
                setSessionsSheetOpen(false);
                router.push({
                  pathname: "/(student)/messages",
                  params: { counselorId: row.counselorId },
                } as any);
              }}
              style={{ flex: 1, padding: 14 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <LetterAvatar
                  name={row.counselorName}
                  avatarUrl={row.counselorAvatarUrl}
                  size={32}
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "700",
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {row.counselorName}
                </Text>
              </View>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: chipPalette.bg,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: chipPalette.text,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {row.chipLabel}
                </Text>
              </View>
              <Text
                style={{
                  color: UI_TEXT_SECONDARY,
                  fontSize: 13,
                  lineHeight: 18,
                }}
                numberOfLines={3}
              >
                {row.summaryLine}
              </Text>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 11,
                  marginTop: 8,
                }}
              >
                Updated {formatStudentSessionTimeAgo(row.updatedAt)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Hide session from this list"
              onPress={() => hideSessionCardFromOverview(row.id)}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 14 }}
              style={{
                paddingHorizontal: 14,
                justifyContent: "flex-start",
                paddingTop: 12,
              }}
            >
              <Trash2 size={18} color={AURORA.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: UI_SCREEN_PADDING,
            paddingBottom: 30,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: UI_SECTION_GAP + 4,
            }}
          >
            <View
              ref={tourWelcomeBlockRef}
              collapsable={false}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <LetterAvatar
                name={user?.full_name ?? user?.preferred_name ?? "Student"}
                size={44}
                avatarUrl={user?.avatar_url}
              />
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: UI_TEXT_MUTED,
                      fontSize: 12,
                      letterSpacing: 1,
                    }}
                  >
                    WELCOME BACK
                  </Text>
                  <View
                    style={{
                      position: "relative",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Animated.View
                      pointerEvents="none"
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        {
                          position: "absolute",
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: "rgba(45, 107, 255, 0.5)",
                        },
                        tourReplayGlowRingStyle,
                      ]}
                    />
                    <TouchableOpacity
                      onPress={replayStudentHomeTour}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Replay home screen tour"
                      style={{
                        zIndex: 1,
                        padding: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(45, 107, 255, 0.45)",
                        backgroundColor: AURORA.card,
                        ...(Platform.OS === "ios"
                          ? {
                              shadowColor: AURORA.blue,
                              shadowOpacity: 0.45,
                              shadowRadius: 8,
                              shadowOffset: { width: 0, height: 0 },
                            }
                          : {
                              elevation: 6,
                            }),
                      }}
                    >
                      <MapPinned size={15} color={AURORA.blueLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  {user?.preferred_name || user?.full_name || "Student"}
                </Text>
              </View>
            </View>
            <View ref={tourSessionsBtnRef} collapsable={false}>
              <TouchableOpacity
                onPress={openSessionsSheet}
                accessibilityRole="button"
                accessibilityLabel="View session requests and confirmed sessions"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: AURORA.card,
                  alignItems: "center",
                  justifyContent: "center",
                 
                }}
              >
                <CalendarClock size={21} color={AURORA.blue} />
                {pendingSessionsCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      minWidth: 16,
                      height: 16,
                      paddingHorizontal: pendingSessionsCount > 9 ? 4 : 0,
                      borderRadius: 8,
                      backgroundColor: AURORA.amber,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: AURORA.bg,
                    }}
                  >
                    <Text
                      style={{
                        color: "#0F172A",
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      {pendingSessionsCount > 99 ? "99+" : pendingSessionsCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── How Are You Feeling Card ────────────────────────────── */}
          <View
            ref={tourMoodCardRef}
            collapsable={false}
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 24,
              padding: 18,
              marginBottom: UI_SECTION_GAP,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: "800",
                marginBottom: 4,
              }}
            >
              How are you feeling?
            </Text>
            <Text
              style={{
                color: UI_TEXT_SECONDARY,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Tap a mood to check in.
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 2,
              }}
            >
              {MOOD_EMOTIONS.map((mood) => (
                <MoodBubble
                  key={mood.name}
                  mood={mood}
                  selected={selectedMood === mood.name}
                  onPress={() => handleMoodTap(mood.name)}
                />
              ))}
            </View>
          </View>

          {/* ── Quick Actions ──────────────────────────────────────── */}
          <View
            ref={tourQuickActionsRef}
            collapsable={false}
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: UI_SECTION_GAP,
            }}
          >
            <QuickActionTile
              label="Request a Session"
              icon={<CalendarPlus size={22} color={AURORA.blue} />}
              wide
              onPress={() => setShowSessionRequestModal(true)}
            />
            {/* <QuickActionTile
                            label="Log Mood"
                            icon={<Camera size={20} color={AURORA.purple} />}
                            onPress={() => setShowLogModal(true)}
                        /> */}
            <QuickActionTile
              label="Messages"
              icon={<MessageSquare size={20} color="#A78BFA" />}
              onPress={() => router.push("/(student)/messages")}
            />
            <QuickActionTile
              label="Zen"
              icon={<BookOpen size={20} color="#34D399" />}
              onPress={() => router.push("/(student)/resources")}
            />
          </View>

          {/* ── Stats Row ──────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: UI_SECTION_GAP,
            }}
          >
            <StreakCard streak={stats.streak} />
            <View
              style={{
                flex: 1,
                backgroundColor: AURORA.card,
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: AURORA.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.16,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                  }}
                >
                  TODAY STABILITY
                </Text>
                <TouchableOpacity
                  onPress={showStabilityInfo}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  style={{ padding: 2 }}
                >
                  <CircleHelp size={14} color={UI_TEXT_MUTED} />
                </TouchableOpacity>
                {/* <View style={{ backgroundColor: 'rgba(45,107,255,0.16)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                                    <Text style={{ color: AURORA.blue, fontSize: 9, fontWeight: '700' }}>Live</Text>
                                </View> */}
              </View>
              <View style={{ marginBottom: 8 }}>
                <TrendingUp size={20} color={AURORA.blue} />
              </View>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "700",
                  lineHeight: 26,
                }}
              >
                {Math.round(Math.max(0, Math.min(100, stats.todayStability)))}%
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: "700",
                  marginTop: 1,
                }}
              >
                Mood Stability
              </Text>
              {/* <Text
                style={{
                  color: UI_TEXT_SECONDARY,
                  fontSize: 10,
                  marginTop: 4,
                  lineHeight: 14,
                }}
              >
                {stats.todayCount <= 0
                  ? "No check-in yet today"
                  : stats.todayCount === 1
                    ? "Add one more check-in"
                    : "Ups and downs today (e.g., higher stress or lower energy in some check-ins)"}
              </Text> */}
            </View>
          </View>

          {/* ── AI Insight ─────────────────────────────────────────── */}
          <AIInsightCard insight={insight} />

          {/* <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('light');
                            router.push('/(student)/daily-selfie');
                        }}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: AURORA.card,
                            borderRadius: 20,
                            padding: 18,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            position: 'relative',
                        }}
                    >
                        <View style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: 'rgba(148,163,184,0.2)',
                        }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>Preview</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 14,
                                backgroundColor: 'rgba(45,107,255,0.2)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <ScanFace size={24} color={AURORA.blue} />
                            </View>
                            <View style={{ flex: 1, paddingRight: 56 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Daily Selfie</Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 4 }}>
                                    See what Aurora notices today
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity> */}

          {/* ── Announcements (dynamic, from admin/counselor) ───────── */}
          <AnnouncementSection role="student" />
        </ScrollView>
      </SafeAreaView>

      {/* ── Session Request Modal ──────────────────────────────────────── */}
      <DashboardSessionRequestModal
        visible={showSessionRequestModal}
        studentId={user?.id ?? ""}
        onClose={() => setShowSessionRequestModal(false)}
        onSuccess={({ counselorId }) =>
          router.push({
            pathname: "/(student)/messages",
            params: { counselorId, openSessionRequest: "1" },
          } as any)
        }
      />

      <Modal
        visible={sessionsSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionsSheetOpen(false)}
      >
        <View style={sessionsSheetStyles.overlay}>
          <TouchableOpacity
            style={sessionsSheetStyles.backdrop}
            activeOpacity={1}
            onPress={() => setSessionsSheetOpen(false)}
          />
          <View style={sessionsSheetStyles.sheet}>
            <View style={sessionsSheetStyles.handleBar} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingRight: 8,
                }}
              >
                <Text style={sessionsSheetStyles.sheetTitle}>My sessions</Text>
                <Text style={sessionsSheetStyles.pendingModalSubtitle}>
                  Future confirmed appointments appear first, followed by
                  counselor invites and anything else that still needs your
                  action.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSessionsSheetOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 6 }}
              >
                <X size={22} color={AURORA.textSec} />
              </TouchableOpacity>
            </View>

            {sessionsLoading ? (
              <View style={{ paddingVertical: 36 }}>
                <ActivityIndicator color={AURORA.blue} />
              </View>
            ) : (
              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {sessionsRawCount === 0 ? (
                  <Text
                    style={{
                      color: AURORA.textSec,
                      fontSize: 14,
                      lineHeight: 20,
                      marginTop: 8,
                    }}
                  >
                    No sessions yet. Use Request a Session below to reach your
                    counselor.
                  </Text>
                ) : sessionsVisibleCount === 0 ? (
                  <Text
                    style={{
                      color: AURORA.textSec,
                      fontSize: 14,
                      lineHeight: 20,
                      marginTop: 8,
                    }}
                  >
                    You've hidden every session from this list. Nothing was
                    removed from Messages or the server.
                  </Text>
                ) : (
                  <>
                    {renderSessionOverviewSection(
                      "Upcoming counseling",
                      "Confirmed times still ahead, or your session time with a (right now) badge for about 90 minutes after start.",
                      sessionsAgreedList,
                      "green",
                      "Confirmed times still ahead, or your session time with a (right now) badge for about 90 minutes after start.",
                    )}
                    {renderSessionOverviewSection(
                      "Past appointments",
                      "Agreed times that already passed — open Messages if you need a follow-up.",
                      sessionsPastAgreedList,
                      "muted",
                      "Agreed times that already passed - open Messages if you need a follow-up.",
                    )}
                    {renderSessionOverviewSection(
                      "Needs your attention",
                      "Counselor invites to confirm, reschedule requests, or other open steps.",
                      sessionsActionList,
                      "amber",
                      "Counselor invites to confirm, reschedule requests, or other open steps.",
                    )}
                    {renderSessionOverviewSection(
                      "Past & closed",
                      "Completed, cancelled, or expired appointments.",
                      sessionsClosedList,
                      "muted",
                      "Completed, cancelled, or expired appointments.",
                    )}
                    {sessionsOtherList.length > 0
                      ? renderSessionOverviewSection(
                          "Other",
                          "",
                          sessionsOtherList,
                          "muted",
                        )
                      : null}
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={sessionsSheetStyles.secondaryBtn}
              onPress={() => {
                setSessionsSheetOpen(false);
                router.push("/(student)/messages");
              }}
              activeOpacity={0.85}
            >
              <Text style={sessionsSheetStyles.secondaryBtnText}>
                Open Messages
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Log Mood Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showCheckInSharingBriefing}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckInSharingBriefing(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 20,
              padding: 22,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Check-ins & guidance
            </Text>
            <Text
              style={{
                color: AURORA.textSec,
                fontSize: 14,
                lineHeight: 21,
                marginBottom: 8,
              }}
            >
              Counselors can see each check-in’s date, time, and mood from your
              last {COUNSELOR_CHECKIN_WINDOW_DAYS} days. Notes, sleep, meals,
              bath, and photos stay hidden until you are in that counselor’s
              special population (session request or accepting their proposed
              time). Full analytics for them are not a diagnosis.
            </Text>
            <Text
              style={{
                color: AURORA.textMuted,
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 18,
              }}
            >
              Read the full wording under Privacy transparency in Profile.
            </Text>
            <TouchableOpacity
              onPress={async () => {
                if (user?.id) {
                  try {
                    await updateUserSettings(user.id, {
                      checkInSharingBriefingSeen: true,
                    });
                  } catch {
                    /* still dismiss */
                  }
                }
                setShowCheckInSharingBriefing(false);
              }}
              style={{
                backgroundColor: AURORA.blue,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                Got it
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (user?.id) {
                  try {
                    await updateUserSettings(user.id, {
                      checkInSharingBriefingSeen: true,
                    });
                  } catch {
                    /* ignore */
                  }
                }
                setShowCheckInSharingBriefing(false);
                router.push("/(student)/profile");
              }}
              style={{ paddingVertical: 14, alignItems: "center" }}
            >
              <Text
                style={{ color: AURORA.blue, fontSize: 14, fontWeight: "700" }}
              >
                Open Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InfoGuideModal guide={activeGuide} onClose={() => setActiveGuide(null)} />

      <SpotlightTourOverlay
        visible={showStudentHomeTour}
        steps={studentHomeTourSteps}
        onRequestClose={() => void endStudentHomeTour(true)}
        onCompleted={() => void endStudentHomeTour(true)}
      />

      {showLogModal && (
        <Modal
          visible={showLogModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLogModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: Platform.OS === "ios" ? 16 : 32,
                paddingBottom: 12,
                backgroundColor: AURORA.bg,
                borderBottomWidth: 1,
                borderBottomColor: AURORA.border,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: AURORA.textPrimary,
                }}
              >
                Mood Check-In
              </Text>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic("light");
                  setShowLogModal(false);
                  setSelectedMood(null);
                }}
                style={{ padding: 8 }}
              >
                <X size={22} color={AURORA.textSec} />
              </TouchableOpacity>
            </View>
            <MoodCheckIn
              initialMood={selectedMood}
              onComplete={() => {
                setShowLogModal(false);
                setSelectedMood(null);
                loadStats();
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const sessionsSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: AURORA.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: AURORA.border,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AURORA.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  pendingModalSubtitle: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryBtnText: {
    color: AURORA.blue,
    fontSize: 15,
    fontWeight: "700",
  },
});
