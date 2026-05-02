import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TrendingUp,
  Lightbulb,
  Camera,
  MessageSquare,
  BookOpen,
  X,
  CalendarPlus,
  ScanFace,
  CircleHelp,
  CalendarClock,
  Trash2,
  Info,
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
import { COUNSELOR_CHECKIN_WINDOW_DAYS } from "../../constants/counselor-checkin-policy";
import {
  getConfirmedFinalSlot,
} from "../../utils/sessionScheduling";
import { parseSlotToDate } from "../../utils/dateHelpers";

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
  status: string;
  summaryLine: string;
  chipLabel: string;
  updatedAt: Date;
  dashboardBucket: StudentSessionDashboardBucket;
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

function isStaleStudentRequestedSession(updatedAt: Date, status: string): boolean {
  if (status !== "requested") return false;
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysElapsed =
    (startOfDay(new Date()) - startOfDay(updatedAt)) / 86400000;
  return daysElapsed >= 3;
}

/** Confirmed slot start is strictly after now → show under upcoming only. */
function isConfirmedSlotInFuture(
  slot: { date: string; time: string } | null,
  nowMs: number = Date.now(),
): boolean {
  if (!slot?.date) return false;
  const parsed = parseSlotToDate({
    date: slot.date,
    time: slot.time ?? "",
  });
  if (!parsed || isNaN(parsed.getTime())) return false;
  return parsed.getTime() > nowMs;
}

function studentSessionDashboardBucket(params: {
  status: string;
  lockedSlot: { date: string; time: string } | null;
}): StudentSessionDashboardBucket {
  const st = params.status.toLowerCase();
  if (STUDENT_SESSION_CLOSED.has(st)) return "closed";
  if (params.lockedSlot) {
    return isConfirmedSlotInFuture(params.lockedSlot) ? "agreed" : "past_agreed";
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
      return st === "rescheduled" ? "Rescheduled" : "Upcoming counseling";
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
  await Promise.all(
    counselorIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "users", id));
        const u = snap.data();
        nameMap[id] = String(
          u?.full_name ?? u?.preferred_name ?? u?.fullName ?? "Counselor",
        );
      } catch {
        nameMap[id] = "Counselor";
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
        isStaleStudentRequestedSession(updatedAt, status)
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
        status,
        summaryLine,
        chipLabel: "",
        updatedAt,
        dashboardBucket,
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
  bgColor,
  wide,
  badge,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
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
          backgroundColor: bgColor,
          borderRadius: 12,
          padding: 10,
          marginBottom: 4,
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
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: "rgba(249,115,22,0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 16 }}>🔥</Text>
      </View>
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
      <Text
        style={{
          color: UI_TEXT_SECONDARY,
          fontSize: 10,
          marginTop: 4,
          lineHeight: 14,
        }}
      >
        Keep checking in daily to grow this streak.
      </Text>
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
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(124,58,237,0.25)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lightbulb size={22} color={AURORA.purple} />
      </View>
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
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getUserSettings(user.id);
        if (!cancelled && !s.checkInSharingBriefingSeen) {
          setShowCheckInSharingBriefing(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
            `your stress was ${stressCat}, and your energy was ${energyCat}.`;
        } else {
          line =
            `${line} Your dominant emotion was ${dominantLabel}. Across ${todayAgg.entryCount} check-ins today, ` +
            `your mood was ${moodCat}, your stress was ${stressCat}, and your energy was ${energyCat}.`;
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

  const showMySessionsInfo = () => {
    triggerHaptic("light");
    setActiveGuide({
      title: "My sessions",
      body:
        "Future confirmed appointments appear first, followed by counselor invites and anything else that still needs your action.\n\n" +
        "Tap a row to open Messages with that counselor.\n\n" +
        "The trash icon only hides a card on this device. It does not cancel your session or remove anything from the server.",
    });
  };

  const renderSessionOverviewSection = (
    title: string,
    subtitle: string,
    rows: StudentSessionOverviewRow[],
    chipTone: "amber" | "green" | "muted",
  ) => {
    if (rows.length === 0) return null;
    const chipPalette =
      chipTone === "green"
        ? { bg: "rgba(34,197,94,0.2)", text: AURORA.green }
        : chipTone === "amber"
          ? { bg: "rgba(254,189,3,0.18)", text: AURORA.amber }
          : { bg: "rgba(148,163,184,0.15)", text: AURORA.textMuted };
    return (
      <View style={{ marginBottom: 18 }}>
        <Text
          style={{
            color: UI_TEXT_MUTED,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        {subtitle.trim() ? (
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
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
                numberOfLines={1}
              >
                {row.counselorName}
              </Text>
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
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <LetterAvatar
                name={user?.full_name ?? user?.preferred_name ?? "Student"}
                size={44}
                avatarUrl={user?.avatar_url}
              />
              <View>
                <Text
                  style={{
                    color: UI_TEXT_MUTED,
                    fontSize: 12,
                    letterSpacing: 1,
                  }}
                >
                  WELCOME BACK
                </Text>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  {user?.preferred_name || user?.full_name || "Student"}
                </Text>
              </View>
            </View>
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
                borderWidth: 1,
                borderColor: AURORA.border,
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

          {/* ── How Are You Feeling Card ────────────────────────────── */}
          <View
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
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: UI_SECTION_GAP,
            }}
          >
            <QuickActionTile
              label="Request a Session"
              icon={<CalendarPlus size={20} color="#FFFFFF" />}
              bgColor={AURORA.blue}
              wide
              onPress={() => setShowSessionRequestModal(true)}
            />
            {/* <QuickActionTile
                            label="Log Mood"
                            icon={<Camera size={18} color="#FFFFFF" />}
                            bgColor={AURORA.purple}
                            onPress={() => setShowLogModal(true)}
                        /> */}
            <QuickActionTile
              label="Messages"
              icon={<MessageSquare size={18} color="#FFFFFF" />}
              bgColor="#7C3AED"
              onPress={() => router.push("/(student)/messages")}
            />
            <QuickActionTile
              label="Resources"
              icon={<BookOpen size={18} color="#FFFFFF" />}
              bgColor="#1A6B5A"
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
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: "rgba(45,107,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <TrendingUp size={16} color={AURORA.blue} />
              </View>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "900",
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
              <Text
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
              </Text>
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
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingRight: 8,
                }}
              >
                <Text style={sessionsSheetStyles.sheetTitle}>My sessions</Text>
                <TouchableOpacity
                  onPress={showMySessionsInfo}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="How My sessions works"
                  style={{ padding: 4 }}
                >
                  <Info size={20} color={AURORA.textSec} />
                </TouchableOpacity>
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
                      "Confirmed times that are still in the future (after you accept an invite or agree on a slot).",
                      sessionsAgreedList,
                      "green",
                    )}
                    {renderSessionOverviewSection(
                      "Past appointments",
                      "Agreed times that already passed — open Messages if you need a follow-up.",
                      sessionsPastAgreedList,
                      "muted",
                    )}
                    {renderSessionOverviewSection(
                      "Needs your attention",
                      "Counselor invites to confirm, reschedule requests, or other open steps.",
                      sessionsActionList,
                      "amber",
                    )}
                    {renderSessionOverviewSection(
                      "Past & closed",
                      "Completed, cancelled, or expired appointments.",
                      sessionsClosedList,
                      "muted",
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
              If you turn on sharing in Settings, counselors can see a brief
              summary from your last {COUNSELOR_CHECKIN_WINDOW_DAYS} days of
              self-reported stress and energy — not your private notes, and not
              a diagnosis.
            </Text>
            <Text
              style={{
                color: AURORA.textMuted,
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 18,
              }}
            >
              Default is off; you stay in control.
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
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InfoGuideModal guide={activeGuide} onClose={() => setActiveGuide(null)} />

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
