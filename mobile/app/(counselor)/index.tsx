/**
 * Counselor Home Dashboard - index.tsx
 * ======================================
 * Route: /(counselor)/
 * Shows stats overview and recent student risk flags.
 * Data fetched from Firestore students + mood logs.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SectionList,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import {
  ChevronRight,
  Users,
  Calendar,
  CalendarClock,
  Trash2,
  X,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../src/stores/AuthContext";
import { AURORA } from "../../src/constants/aurora-colors";
import { LetterAvatar } from "../../src/components/common/LetterAvatar";
import { firestoreService } from "../../src/services/firebase-firestore.service";
import { AnnouncementSection } from "../../src/components/announcements/AnnouncementSection";
import { triggerHaptic } from "../../src/utils/haptics";
import { formatCounselorStudentSubtitle } from "../../src/constants/ccs-student-programs";
import {
  getConfirmedFinalSlot,
  getSessionScheduledDate,
} from "../../src/utils/sessionScheduling";
import { parseSlotToDate } from "../../src/utils/dateHelpers";
import { fetchStudentCheckInSignalContextForCounselor } from "../../src/services/counselor-checkin-context.service";
import {
  type CounselorSignalPill,
  COUNSELOR_SIGNAL_LABEL,
  COUNSELOR_SIGNAL_SORT,
  counselorSignalFromLogs,
} from "../../src/constants/counselor-checkin-signals";
import { db } from "../../src/services/firebase";

const hiddenCounselorSessionsSheetStorageKey = (counselorId: string) =>
  `aurora.counselorSessionsSheet.hidden:${counselorId}`;

async function loadHiddenCounselorSheetSessionIds(
  counselorId: string,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(
      hiddenCounselorSessionsSheetStorageKey(counselorId),
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

async function saveHiddenCounselorSheetSessionIds(
  counselorId: string,
  ids: string[],
): Promise<void> {
  await AsyncStorage.setItem(
    hiddenCounselorSessionsSheetStorageKey(counselorId),
    JSON.stringify(ids),
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
/** Rows shown in counselor header session sheet (not raw "pending request" spam). */
type CounselorSessionOverviewCategory =
  | "upcoming"
  | "completed"
  | "missed"
  | "expired";

interface PendingSessionItem {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  status: string;
  category: CounselorSessionOverviewCategory;
  /** Agreed slot or student preference line for the row subtitle. */
  scheduleSummary?: string;
  studentRequestNote: string;
  updatedAt: Date;
  scheduledSortMs: number;
}

/** Intermediate shape before resolving student display names from Firestore. */
interface PendingSessionRowDraft {
  id: string;
  studentId: string;
  category: CounselorSessionOverviewCategory;
  status: string;
  scheduleSummary?: string;
  studentRequestNote: string;
  updatedAt: Date;
  scheduledSortMs: number;
}

interface FlagItem {
  id: string;
  name: string;
  program: string;
  time: string;
  signal: CounselorSignalPill;
  avatar: string;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getSignalStyle(signal: CounselorSignalPill) {
  switch (signal) {
    case "higher_self_report":
      return {
        border: AURORA.red,
        badgeBg: "rgba(239,68,68,0.18)",
        text: AURORA.red,
      };
    case "moderate_self_report":
      return {
        border: AURORA.orange,
        badgeBg: "rgba(249,115,22,0.18)",
        text: AURORA.orange,
      };
    case "typical_self_report":
      return {
        border: AURORA.blue,
        badgeBg: "rgba(45,107,255,0.18)",
        text: AURORA.blue,
      };
    case "no_checkins":
      return {
        border: AURORA.amber,
        badgeBg: "rgba(254,189,3,0.1)",
        text: AURORA.amber,
      };
  }
}

function firestoreTsToDate(v: unknown): Date {
  if (
    v != null &&
    typeof v === "object" &&
    typeof (v as { toDate?: () => Date }).toDate === "function"
  ) {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function counselorSessionOverviewCategory(
  s: Record<string, unknown>,
): CounselorSessionOverviewCategory | null {
  const st = String(s?.status ?? "").toLowerCase();

  if (st === "completed") return "completed";
  if (st === "missed") return "missed";
  if (st === "expired") return "expired";

  if (st === "confirmed" || st === "rescheduled") {
    const locked = getConfirmedFinalSlot(
      s as { finalSlot?: unknown; confirmedSlot?: unknown },
    );
    if (!locked?.date) return null;
    const parsed = parseSlotToDate({
      date: locked.date,
      time: locked.time ?? "",
    });
    if (!parsed || isNaN(parsed.getTime())) return null;
    if (parsed.getTime() > Date.now()) return "upcoming";
    return null;
  }

  return null;
}

const CATEGORY_SORT_ORDER: Record<CounselorSessionOverviewCategory, number> = {
  upcoming: 0,
  completed: 1,
  missed: 2,
  expired: 3,
};

const COUNSELOR_SESSIONS_SHEET_SECTION_ORDER: CounselorSessionOverviewCategory[] =
  ["upcoming", "completed", "missed", "expired"];

const COUNSELOR_SESSIONS_SHEET_SECTION_COPY: Record<
  CounselorSessionOverviewCategory,
  { title: string; subtitle: string }
> = {
  upcoming: {
    title: "Upcoming counseling",
    subtitle: "Agreed times that are still in the future.",
  },
  completed: {
    title: "Completed",
    subtitle: "You marked the student as showed up.",
  },
  missed: {
    title: "Missed",
    subtitle: "Sessions marked missed or no-show.",
  },
  expired: {
    title: "Expired",
    subtitle: "Requests or slots that expired without completing.",
  },
};

interface CounselorSessionsSheetSection {
  key: CounselorSessionOverviewCategory;
  sectionIndex: number;
  title: string;
  subtitle: string;
  data: PendingSessionItem[];
}

function buildCounselorSessionsSheetSections(
  items: PendingSessionItem[],
): CounselorSessionsSheetSection[] {
  const buckets = new Map<
    CounselorSessionOverviewCategory,
    PendingSessionItem[]
  >();
  for (const c of COUNSELOR_SESSIONS_SHEET_SECTION_ORDER) {
    buckets.set(c, []);
  }
  for (const item of items) {
    buckets.get(item.category)?.push(item);
  }
  const nonempty = COUNSELOR_SESSIONS_SHEET_SECTION_ORDER.filter(
    (c) => (buckets.get(c)?.length ?? 0) > 0,
  );
  return nonempty.map((c, sectionIndex) => ({
    key: c,
    sectionIndex,
    ...COUNSELOR_SESSIONS_SHEET_SECTION_COPY[c],
    data: buckets.get(c)!,
  }));
}

async function buildPendingSessionsList(
  sessions: Array<Record<string, unknown>>,
): Promise<PendingSessionItem[]> {
  const drafts: PendingSessionRowDraft[] = [];

  for (const s of sessions) {
    const category = counselorSessionOverviewCategory(s);
    if (!category) continue;

    const id = String(s.id ?? "");
    const sid = String(s.studentId ?? "");
    if (!id || !sid) continue;

    const locked = getConfirmedFinalSlot(
      s as { finalSlot?: unknown; confirmedSlot?: unknown },
    );
    const prefRaw =
      typeof s.preferredTimeFromStudent === "string"
        ? s.preferredTimeFromStudent.trim()
        : "";
    let scheduleSummary: string | undefined;
    if (locked?.date) {
      scheduleSummary = `Scheduled: ${locked.date}${locked.time ? ` · ${locked.time}` : ""}`;
    } else if (prefRaw) {
      scheduleSummary = `Preferred: ${prefRaw}`;
    }

    let scheduledSortMs = firestoreTsToDate(s.updatedAt).getTime();
    if (category === "upcoming" && locked?.date) {
      const parsed = parseSlotToDate({
        date: locked.date,
        time: locked.time ?? "",
      });
      if (parsed && !isNaN(parsed.getTime())) {
        scheduledSortMs = parsed.getTime();
      }
    }

    drafts.push({
      id,
      studentId: sid,
      category,
      status: String(s.status ?? ""),
      scheduleSummary,
      studentRequestNote:
        typeof s.studentRequestNote === "string" ? s.studentRequestNote : "",
      updatedAt: firestoreTsToDate(s.updatedAt),
      scheduledSortMs,
    });
  }

  if (drafts.length === 0) return [];

  const studentIds = [...new Set(drafts.map((d) => d.studentId))];
  const userSnaps = await Promise.all(
    studentIds.map((id) => getDoc(doc(db, "users", id))),
  );
  const nameById: Record<string, { name: string; avatar?: string }> = {};
  studentIds.forEach((id, i) => {
    const u = userSnaps[i].data();
    nameById[id] = {
      name: String(u?.full_name ?? u?.fullName ?? "Student"),
      avatar: typeof u?.avatar_url === "string" ? u.avatar_url : undefined,
    };
  });

  const rows: PendingSessionItem[] = drafts.map((d) => {
    const meta = nameById[d.studentId];
    return {
      id: d.id,
      studentId: d.studentId,
      studentName: meta?.name ?? "Student",
      studentAvatar: meta?.avatar,
      status: d.status,
      category: d.category,
      scheduleSummary: d.scheduleSummary,
      studentRequestNote: d.studentRequestNote,
      updatedAt: d.updatedAt,
      scheduledSortMs: d.scheduledSortMs,
    };
  });

  return rows.sort((a, b) => {
    const tier =
      CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category];
    if (tier !== 0) return tier;
    if (a.category === "upcoming" && b.category === "upcoming") {
      return a.scheduledSortMs - b.scheduledSortMs;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function pendingSessionStatusLabel(
  category: CounselorSessionOverviewCategory,
): string {
  switch (category) {
    case "upcoming":
      return "Upcoming";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "expired":
      return "Expired";
    default:
      return "";
  }
}

function pendingSessionCategoryStyle(
  category: CounselorSessionOverviewCategory,
): {
  bg: string;
  border: string;
  text: string;
} {
  switch (category) {
    case "upcoming":
      return {
        bg: "rgba(34,197,94,0.18)",
        border: "rgba(34,197,94,0.45)",
        text: AURORA.green,
      };
    case "completed":
      return {
        bg: "rgba(45,107,255,0.18)",
        border: "rgba(45,107,255,0.45)",
        text: AURORA.blue,
      };
    case "missed":
      return {
        bg: "rgba(239,68,68,0.16)",
        border: "rgba(239,68,68,0.4)",
        text: AURORA.red,
      };
    case "expired":
      return {
        bg: "rgba(148,163,184,0.14)",
        border: "rgba(148,163,184,0.35)",
        text: AURORA.textMuted,
      };
    default:
      return {
        bg: "rgba(148,163,184,0.14)",
        border: "rgba(148,163,184,0.35)",
        text: AURORA.textSec,
      };
  }
}

function formatSignalChip(signal: CounselorSignalPill): string {
  switch (signal) {
    case "higher_self_report":
      return COUNSELOR_SIGNAL_LABEL.higher_self_report;
    case "moderate_self_report":
      return "Monitor";
    case "typical_self_report":
      return "Typical";
    case "no_checkins":
      return "No recent check-in";
    default:
      return COUNSELOR_SIGNAL_LABEL[signal];
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  count: string | number;
  label: string;
  cardBg?: string;
}

function StatCard({ icon, count, label, cardBg }: StatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cardBg || AURORA.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: AURORA.border,
        minHeight: 120,
      }}
    >
      {icon}
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 28,
          fontWeight: "800",
          marginTop: 8,
          letterSpacing: -0.5,
        }}
      >
        {count}
      </Text>
      <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function FlagRow({ item }: { item: FlagItem }) {
  const style = getSignalStyle(item.signal);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        triggerHaptic("light");
        router.push({
          pathname: "/(counselor)/students",
          params: { openStudentId: item.id },
        });
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: AURORA.card,
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: AURORA.border,
      }}
    >
      <View
        style={{
          width: 4,
          backgroundColor: style.border,
          alignSelf: "stretch",
        }}
      />
      <View style={{ margin: 12 }}>
        <LetterAvatar name={item.name} size={48} avatarUrl={item.avatar} />
      </View>
      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <Text
          style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.program}
        </Text>
        <Text style={{ color: "#9FB0D4", fontSize: 11, marginTop: 2 }}>
          {item.time}
        </Text>
      </View>
      <View
        style={{
          flexShrink: 0,
          backgroundColor: style.badgeBg,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 5,
          marginRight: 8,
          borderWidth: 1,
          borderColor: `${style.text}44`,
        }}
      >
        <Text
          style={{
            color: style.text,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.35,
          }}
          numberOfLines={2}
        >
          {formatSignalChip(item.signal)}
        </Text>
      </View>
      <View style={{ flexShrink: 0 }}>
        <ChevronRight
          size={16}
          color={AURORA.textMuted}
          style={{ marginRight: 12 }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorHomeScreen() {
  const { user } = useAuth();
  const [studentCount, setStudentCount] = useState<number>(0);
  const [recentFlags, setRecentFlags] = useState<FlagItem[]>([]);
  const [upcomingAcceptedSessions, setUpcomingAcceptedSessions] =
    useState<number>(0);
  const [needsFollowUpCount, setNeedsFollowUpCount] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingSessions, setPendingSessions] = useState<PendingSessionItem[]>(
    [],
  );
  const [pendingSessionsModalVisible, setPendingSessionsModalVisible] =
    useState(false);
  const [hiddenCounselorSheetSessionIds, setHiddenCounselorSheetSessionIds] =
    useState<string[]>([]);
  const firstName = user?.full_name?.split(" ")[0] || "Counselor";

  useEffect(() => {
    if (!user?.id) {
      setHiddenCounselorSheetSessionIds([]);
      return;
    }
    let cancelled = false;
    void loadHiddenCounselorSheetSessionIds(user.id).then((ids) => {
      if (!cancelled) setHiddenCounselorSheetSessionIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hiddenCounselorSheetSessionSet = useMemo(
    () => new Set(hiddenCounselorSheetSessionIds),
    [hiddenCounselorSheetSessionIds],
  );

  const visiblePendingSessions = useMemo(
    () =>
      pendingSessions.filter((s) => !hiddenCounselorSheetSessionSet.has(s.id)),
    [pendingSessions, hiddenCounselorSheetSessionSet],
  );

  const pendingSessionsSections = useMemo(
    () => buildCounselorSessionsSheetSections(visiblePendingSessions),
    [visiblePendingSessions],
  );

  const hideCounselorSheetSessionCard = useCallback(
    (sessionId: string) => {
      triggerHaptic("light");
      setHiddenCounselorSheetSessionIds((prev) => {
        if (prev.includes(sessionId)) return prev;
        const next = [...prev, sessionId];
        if (user?.id) void saveHiddenCounselorSheetSessionIds(user.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const fetchData = useCallback(
    async (isCancelled?: () => boolean) => {
      try {
        const students = await firestoreService.getUsersByRole("student");
        if (isCancelled?.()) return;

        setStudentCount(students.length);

        // Fetch recent mood logs for students (limit to first 15 for performance)
        const limit = Math.min(15, students.length);
        const studentsWithMood = await Promise.all(
          students.slice(0, limit).map(async (s) => {
            try {
              const { logs } =
                await fetchStudentCheckInSignalContextForCounselor(s.id);
              const latest = logs[0] as
                | {
                    log_date?: Date;
                    stress_level?: number;
                    energy_level?: number;
                  }
                | undefined;
              return {
                student: s,
                logs,
                lastLogDate: latest?.log_date,
              };
            } catch {
              return {
                student: s,
                logs: [] as { stress_level?: number; energy_level?: number }[],
                lastLogDate: undefined as Date | undefined,
              };
            }
          }),
        );

        if (isCancelled?.()) return;

        const flags: FlagItem[] = studentsWithMood
          .map(({ student, logs, lastLogDate }) => {
            const signal = counselorSignalFromLogs(logs);
            return {
              id: student.id,
              name: student.full_name || "Student",
              program:
                formatCounselorStudentSubtitle({
                  department: student.department,
                  program: student.program,
                  year_level: student.year_level,
                }) || "CCS",
              time: lastLogDate
                ? formatTimeAgo(new Date(lastLogDate))
                : "No check-ins yet",
              signal,
              avatar: (student as any).avatar_url ?? "",
            };
          })
          .sort(
            (a, b) =>
              COUNSELOR_SIGNAL_SORT[a.signal] - COUNSELOR_SIGNAL_SORT[b.signal],
          );

        setRecentFlags(flags);
        setNeedsFollowUpCount(
          flags.filter((f) =>
            [
              "higher_self_report",
              "moderate_self_report",
              "no_checkins",
            ].includes(f.signal),
          ).length,
        );

        if (user?.id) {
          const sessions = await firestoreService.getSessionsForCounselor(
            user.id,
          );
          const now = Date.now();
          const upcoming = (sessions as Array<Record<string, any>>).filter(
            (s) => {
              // "Accepted" sessions can appear as confirmed or rescheduled in the canonical sessions doc.
              const status = String(s?.status ?? "").toLowerCase();
              if (!["confirmed", "rescheduled"].includes(status)) return false;
              if (String(s?.counselorId ?? "") !== user.id) return false;
              const dt = getSessionScheduledDate({
                finalSlot: (s.finalSlot as any) ?? null,
                confirmedSlot: (s.confirmedSlot as any) ?? null,
                proposedSlots: Array.isArray(s.proposedSlots)
                  ? (s.proposedSlots as any)
                  : [],
                preferredTimeFromStudent:
                  typeof s.preferredTimeFromStudent === "string"
                    ? s.preferredTimeFromStudent
                    : undefined,
              });
              return !!dt && dt.getTime() >= now;
            },
          ).length;
          setUpcomingAcceptedSessions(upcoming);

          try {
            const pendings = await buildPendingSessionsList(
              sessions as Array<Record<string, unknown>>,
            );
            if (!isCancelled?.()) setPendingSessions(pendings);
          } catch {
            if (!isCancelled?.()) setPendingSessions([]);
          }
        } else {
          setUpcomingAcceptedSessions(0);
          setPendingSessions([]);
        }
        setLastUpdatedAt(new Date());
      } catch {
        if (!isCancelled?.()) {
          setRecentFlags([]);
          setUpcomingAcceptedSessions(0);
          setNeedsFollowUpCount(0);
          setPendingSessions([]);
        }
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchData(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void fetchData(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [fetchData]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              borderWidth: 2,
              borderColor: AURORA.green,
              borderRadius: 27,
            }}
          >
            <LetterAvatar
              name={user?.full_name ?? "Counselor"}
              size={50}
              avatarUrl={user?.avatar_url}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                color: AURORA.textSec,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.4,
              }}
            >
              COUNSELOR PORTAL
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              Hello, {firstName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("light");
              setPendingSessionsModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Sessions overview"
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
            <CalendarClock size={22} color={AURORA.textSec} />
            {visiblePendingSessions.length > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: AURORA.orange,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: AURORA.card,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  {visiblePendingSessions.length > 99
                    ? "99+"
                    : visiblePendingSessions.length}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Content ───────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        >
          {/* Dashboard Overview */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
              Dashboard Overview
            </Text>
          </View>

          {/* Stat Cards Row 1 */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <StatCard
              icon={
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "rgba(45,107,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={18} color={AURORA.blue} />
                </View>
              }
              count={studentCount}
              label="Total Students"
            />
            <StatCard
              icon={
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "rgba(16,185,129,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={18} color={AURORA.green} />
                </View>
              }
              count={upcomingAcceptedSessions}
              label="Upcoming Accepted Sessions"
              cardBg="rgba(5,67,52,0.5)"
            />
          </View>
          {/* <View style={{ marginBottom: 10 }}>
                        <View
                            style={{
                                backgroundColor: 'rgba(139, 92, 246, 0.14)',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: 'rgba(139, 92, 246, 0.35)',
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' }} />
                                <Text style={{ color: '#D8CCFF', fontSize: 12, fontWeight: '700' }}>
                                    Needs follow-up today
                                </Text>
                            </View>
                            <Text style={{ color: '#F3EEFF', fontSize: 16, fontWeight: '800' }}>
                                {needsFollowUpCount}
                            </Text>
                        </View>
                    </View> */}

          {/* Recent Flags */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
              Recent check-ins
            </Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic("light");
                router.push("/(counselor)/students");
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Text
                style={{ color: AURORA.blue, fontSize: 13, fontWeight: "700" }}
              >
                VIEW ALL
              </Text>
              <ChevronRight size={14} color={AURORA.blue} />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 11,
              marginTop: -8,
              marginBottom: 10,
            }}
          >
            Sorted by priority • Updated{" "}
            {lastUpdatedAt ? formatTimeAgo(lastUpdatedAt) : "just now"}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                Loading...
              </Text>
            </View>
          ) : recentFlags.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                No students to show here yet.
              </Text>
            </View>
          ) : (
            recentFlags.map((item) => <FlagRow key={item.id} item={item} />)
          )}

          {/* ── Announcements (dynamic, from admin/counselor) ───────── */}
          <AnnouncementSection role="counselor" showAddButton />
        </ScrollView>

        <Modal
          visible={pendingSessionsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPendingSessionsModalVisible(false)}
        >
          <View style={styles.pendingModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setPendingSessionsModalVisible(false)}
            />
            <View style={styles.pendingModalSheet}>
              <View style={styles.pendingModalHandle} />
              <View style={styles.pendingModalHeader}>
                <Text style={styles.pendingModalTitle}>Sessions</Text>
                <TouchableOpacity
                  onPress={() => setPendingSessionsModalVisible(false)}
                  hitSlop={12}
                  style={styles.pendingModalClose}
                >
                  <X size={22} color={AURORA.textSec} />
                </TouchableOpacity>
              </View>
              <Text style={styles.pendingModalSubtitle}>
                Upcoming agreed times, plus completed (showed up), missed, and
                expired ({visiblePendingSessions.length})
              </Text>

              {pendingSessions.length === 0 ? (
                <View style={styles.pendingEmpty}>
                  <CalendarClock size={40} color={AURORA.textMuted} />
                  <Text style={styles.pendingEmptyTitle}>All caught up</Text>
                  <Text style={styles.pendingEmptyBody}>
                    No upcoming appointments or completed, missed, or expired
                    sessions to show.
                  </Text>
                </View>
              ) : visiblePendingSessions.length === 0 ? (
                <View style={styles.pendingEmpty}>
                  <CalendarClock size={40} color={AURORA.textMuted} />
                  <Text style={styles.pendingEmptyTitle}>Nothing visible</Text>
                  <Text style={styles.pendingEmptyBody}>
                    Every session here is hidden from this overview only. Open
                    Session History to see the full list.
                  </Text>
                </View>
              ) : (
                <SectionList
                  sections={pendingSessionsSections}
                  keyExtractor={(item) => item.id}
                  stickySectionHeadersEnabled={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 28 }}
                  renderSectionHeader={({
                    section,
                  }: {
                    section: CounselorSessionsSheetSection;
                  }) => (
                    <View
                      style={{
                        paddingTop: section.sectionIndex === 0 ? 0 : 14,
                      }}
                    >
                      <Text style={styles.pendingSectionTitle}>
                        {section.title}
                      </Text>
                      {section.subtitle.trim() ? (
                        <Text style={styles.pendingSectionSubtitle}>
                          {section.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  )}
                  renderItem={({ item }) => {
                    const stStyle = pendingSessionCategoryStyle(item.category);
                    const notePreview = item.studentRequestNote.trim();
                    const snippet =
                      notePreview.length > 100
                        ? `${notePreview.slice(0, 100)}…`
                        : notePreview;
                    return (
                      <View style={styles.pendingRowOuter}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            triggerHaptic("light");
                            setPendingSessionsModalVisible(false);
                            router.push({
                              pathname: "/(counselor)/session-history",
                              params: { sessionId: item.id },
                            });
                          }}
                          style={styles.pendingRowMain}
                        >
                          <LetterAvatar
                            name={item.studentName}
                            size={48}
                            avatarUrl={item.studentAvatar}
                          />
                          <View
                            style={{ flex: 1, minWidth: 0, marginLeft: 12 }}
                          >
                            <Text
                              style={styles.pendingRowName}
                              numberOfLines={1}
                            >
                              {item.studentName}
                            </Text>
                            {item.scheduleSummary ? (
                              <Text
                                style={styles.pendingRowMeta}
                                numberOfLines={2}
                              >
                                {item.scheduleSummary}
                              </Text>
                            ) : null}
                            {snippet ? (
                              <Text
                                style={styles.pendingRowNote}
                                numberOfLines={2}
                              >
                                {snippet}
                              </Text>
                            ) : null}
                            <Text style={styles.pendingRowUpdated}>
                              Updated {formatTimeAgo(item.updatedAt)}
                            </Text>
                          </View>
                          <View
                            style={{
                              alignSelf: "flex-start",
                              backgroundColor: stStyle.bg,
                              borderRadius: 10,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderWidth: 1,
                              borderColor: stStyle.border,
                              maxWidth: 120,
                            }}
                          >
                            <Text
                              style={{
                                color: stStyle.text,
                                fontSize: 10,
                                fontWeight: "800",
                                textAlign: "center",
                              }}
                              numberOfLines={2}
                            >
                              {pendingSessionStatusLabel(item.category)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Hide session from this list"
                          onPress={() => hideCounselorSheetSessionCard(item.id)}
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
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pendingModalSheet: {
    backgroundColor: "#0c1028",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingBottom: 12,
    maxHeight: "78%",
  },
  pendingModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  pendingModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pendingModalTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  pendingModalClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pendingModalSubtitle: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  pendingSectionTitle: {
    color: AURORA.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pendingSectionSubtitle: {
    color: AURORA.textSec,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  pendingEmpty: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 12,
  },
  pendingEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
  },
  pendingEmptyBody: {
    color: AURORA.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  pendingRowOuter: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: AURORA.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AURORA.border,
  },
  pendingRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
    minWidth: 0,
  },
  pendingRowName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pendingRowMeta: {
    color: AURORA.textSec,
    fontSize: 12,
    marginTop: 4,
  },
  pendingRowNote: {
    color: "#C1CEE9",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  pendingRowUpdated: {
    color: AURORA.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
