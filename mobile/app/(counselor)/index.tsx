import { AppText as Text } from "../../src/components/common/AppText";
/**
 * Counselor Home Dashboard - index.tsx
 * ======================================
 * Route: /(counselor)/
 * Shows stats overview and a short student roster.
 * Roster chips reflect session scheduling consent only (not whole-roster mood triage).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, TouchableOpacity, Modal, SectionList, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  CalendarClock,
  Trash2,
  X,
  CircleHelp,
  LayoutDashboard,
  GraduationCap,
  Megaphone,
  MapPinned,
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
  getAgreedSessionSlot,
  getConfirmedFinalSlot,
  getSessionScheduledDate,
} from "../../src/utils/sessionScheduling";
import {
  isSameDay,
  isSessionDocOpenRequestExpired24h,
  parseSlotToDate,
} from "../../src/utils/dateHelpers";
import { fetchStudentCheckInSignalContextForCounselor } from "../../src/services/counselor-checkin-context.service";
import { getUserSettings } from "../../src/services/mood-firestore-v2.service";
import {
  type CounselorStudentRosterPill,
  COUNSELOR_ROSTER_PILL_LABEL,
  COUNSELOR_ROSTER_PILL_SORT,
} from "../../src/constants/counselor-student-roster-pills";
import { db } from "../../src/services/firebase";
import {
  SpotlightTourOverlay,
  type SpotlightTourStep,
} from "../../src/components/tours/SpotlightTourOverlay";
import {
  isCounselorHomeTourCompleted,
  markCounselorHomeTourCompleted,
} from "../../src/services/counselor-home-tour.storage";
import {
  InfoGuideOverlay,
  type InfoGuideContent,
} from "../../src/components/common/InfoGuideModal";

const hiddenCounselorSessionsSheetStorageKey = (counselorId: string) =>
  `aurora.counselorSessionsSheet.hidden:${counselorId}`;
const STUDENTS_PAGE_SIZE = 5;

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
/** Rows shown in counselor header session sheet. */
type CounselorSessionOverviewCategory =
  /** Student started scheduling; no locked time yet (approve request or wait on their pick). */
  | "student_request_pending"
  /** Counselor invite; student has not locked a time yet. */
  | "counselor_invite_pending"
  | "upcoming"
  /** Agreed time passed (or needs_rescheduling) but not completed / missed / expired — same rows Session History shows as Today / Reschedule. */
  | "awaiting_action"
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
  rosterPill: CounselorStudentRosterPill;
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
function getRosterPillStyle(
  pill: CounselorStudentRosterPill,
): { badgeBg: string; border: string; text: string } {
  switch (pill) {
    case "session_started":
      return {
        badgeBg: "rgba(45,107,255,0.18)",
        border: "",
        text: AURORA.blue,
      };
    case "no_session_yet":
      return {
        badgeBg: "rgba(148,163,184,0.12)",
        border: "",
        text: AURORA.textSec,
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
  const initiatedBy = String(s?.initiatedBy ?? "").toLowerCase();
  const fromCounselor = initiatedBy === "counselor";
  const locked = getConfirmedFinalSlot(
    s as { finalSlot?: unknown; confirmedSlot?: unknown },
  );
  const hasLocked = !!(locked?.date && String(locked.date).trim());

  if (st === "completed") return "completed";
  if (st === "missed") return "missed";
  if (st === "expired") return "expired";

  if (st === "needs_rescheduling") {
    return "awaiting_action";
  }

  // Not yet agreed — show in dashboard sheet only here (Session History stays agreed-only).
  if (!hasLocked) {
    if (
      isSessionDocOpenRequestExpired24h({
        status: st,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
    ) {
      return "expired";
    }
    if (fromCounselor && st === "pending") {
      return "counselor_invite_pending";
    }
    if (!fromCounselor && (st === "requested" || st === "pending")) {
      return "student_request_pending";
    }
  }

  if (
    st === "confirmed" ||
    st === "rescheduled" ||
    (st === "pending" && hasLocked)
  ) {
    if (!hasLocked) return null;
    const parsed = parseSlotToDate({
      date: locked!.date,
      time: locked!.time ?? "",
    });
    if (!parsed || isNaN(parsed.getTime())) return null;
    if (parsed.getTime() > Date.now()) return "upcoming";
    return "awaiting_action";
  }

  return null;
}

const CATEGORY_SORT_ORDER: Record<CounselorSessionOverviewCategory, number> = {
  student_request_pending: 0,
  counselor_invite_pending: 1,
  upcoming: 2,
  awaiting_action: 3,
  completed: 4,
  missed: 5,
  expired: 6,
};

const COUNSELOR_SESSIONS_SHEET_SECTION_ORDER: CounselorSessionOverviewCategory[] =
  [
    "student_request_pending",
    "counselor_invite_pending",
    "upcoming",
    "awaiting_action",
    "completed",
    "missed",
    "expired",
  ];

const COUNSELOR_SESSIONS_SHEET_SECTION_COPY: Record<
  CounselorSessionOverviewCategory,
  { title: string; subtitle: string }
> = {
  student_request_pending: {
    title: "Student requests",
    subtitle:
      "The student started this session — approve or propose times in Messages. Includes waiting on them to pick a slot you sent.",
  },
  counselor_invite_pending: {
    title: "Your invites (awaiting student)",
    subtitle:
      "You sent this session — the student still needs to accept or choose a time in Messages.",
  },
  upcoming: {
    title: "Upcoming counseling",
    subtitle: "Agreed times that are still in the future.",
  },
  awaiting_action: {
    title: "Needs follow-up",
    subtitle:
      "Scheduled time has passed or the session needs rescheduling — same items as Session History (Today / Reschedule). Mark attendance there.",
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
    title: "Expired requests",
    subtitle:
      "Open session requests that were not accepted within 24 hours (or the preferred time already passed).",
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
    const agreedForDisplay =
      locked ??
      getAgreedSessionSlot(
        s as {
          finalSlot?: { date: string; time: string } | null;
          confirmedSlot?: { date: string; time: string } | null;
          proposedSlots?: Array<{ date: string; time: string }>;
        },
      );
    const prefRaw =
      typeof s.preferredTimeFromStudent === "string"
        ? s.preferredTimeFromStudent.trim()
        : "";
    let scheduleSummary: string | undefined;
    if (agreedForDisplay?.date) {
      scheduleSummary = `Scheduled: ${agreedForDisplay.date}${agreedForDisplay.time ? ` · ${agreedForDisplay.time}` : ""}`;
    } else if (prefRaw) {
      scheduleSummary = `Preferred: ${prefRaw}`;
    }

    let scheduledSortMs = firestoreTsToDate(s.updatedAt).getTime();
    if (
      (category === "upcoming" || category === "awaiting_action") &&
      agreedForDisplay?.date
    ) {
      const parsed = parseSlotToDate({
        date: agreedForDisplay.date,
        time: agreedForDisplay.time ?? "",
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
    if (
      (a.category === "upcoming" && b.category === "upcoming") ||
      (a.category === "awaiting_action" && b.category === "awaiting_action")
    ) {
      return a.scheduledSortMs - b.scheduledSortMs;
    }
    if (
      (a.category === "student_request_pending" &&
        b.category === "student_request_pending") ||
      (a.category === "counselor_invite_pending" &&
        b.category === "counselor_invite_pending")
    ) {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function pendingSessionStatusLabel(
  category: CounselorSessionOverviewCategory,
): string {
  switch (category) {
    case "student_request_pending":
      return "Student request";
    case "counselor_invite_pending":
      return "Awaiting student";
    case "upcoming":
      return "Upcoming";
    case "awaiting_action":
      return "Follow-up";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "expired":
      return "Expired request";
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
    case "student_request_pending":
      return {
        bg: "rgba(45,107,255,0.2)",
        border: "rgba(45,107,255,0.45)",
        text: AURORA.blueLight,
      };
    case "counselor_invite_pending":
      return {
        bg: "rgba(168,85,247,0.18)",
        border: "rgba(168,85,247,0.45)",
        text: "#c4b5fd",
      };
    case "upcoming":
      return {
        bg: "rgba(34,197,94,0.18)",
        border: "rgba(34,197,94,0.45)",
        text: AURORA.green,
      };
    case "awaiting_action":
      return {
        bg: "rgba(254,189,3,0.18)",
        border: "rgba(254,189,3,0.45)",
        text: AURORA.amber,
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

function formatRosterPillChip(pill: CounselorStudentRosterPill): string {
  return COUNSELOR_ROSTER_PILL_LABEL[pill];
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
  const style = getRosterPillStyle(item.rosterPill);
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
        paddingVertical: 8,
        paddingRight: 4,
      }}
    >
      <View
        style={{
          width: 4,
          backgroundColor: style.border,
          alignSelf: "stretch",
        }}
      />
      <View style={{ marginLeft: 12, marginRight: 12 }}>
        <LetterAvatar name={item.name} size={48} avatarUrl={item.avatar} />
      </View>
      <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
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
          paddingVertical: 6,
          marginRight: 10,
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
          {formatRosterPillChip(item.rosterPill)}
        </Text>
      </View>
      <View style={{ flexShrink: 0 }}>
        <ChevronRight
          size={16}
          color={AURORA.textMuted}
          style={{ marginRight: 2 }}
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingSessions, setPendingSessions] = useState<PendingSessionItem[]>(
    [],
  );
  const [pendingSessionsModalVisible, setPendingSessionsModalVisible] =
    useState(false);
  const [sessionsSectionGuide, setSessionsSectionGuide] =
    useState<InfoGuideContent | null>(null);
  const [hiddenCounselorSheetSessionIds, setHiddenCounselorSheetSessionIds] =
    useState<string[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const firstName = user?.full_name?.split(" ")[0] || "Counselor";

  const [showCounselorHomeTour, setShowCounselorHomeTour] = useState(false);
  const tourWelcomePortalRef = useRef<View>(null);
  const tourSessionsBtnRef = useRef<View>(null);
  const tourDashboardRef = useRef<View>(null);
  const tourStudentsHeaderRef = useRef<View>(null);
  const tourAnnouncementsRef = useRef<View>(null);
  const counselorHomeTourAutoKeyRef = useRef<string | null>(null);

  const counselorHomeTourSteps = useMemo<SpotlightTourStep[]>(
    () => [
      {
        title: "Welcome to Home",
        body: "A quick tour of your counselor dashboard: sessions, stats, roster, and announcements. Tap Next to continue or Skip tour anytime.",
      },
      {
        title: "Your portal header",
        body: "Your photo and greeting stay here. Replay this tour later from the map icon next to counselor portal.",
        targetRef: tourWelcomePortalRef,
        padding: 10,
      },
      {
        title: "Sessions overview",
        body: "Open the calendar to see student requests, invites, upcoming visits, and items that need follow-up—all in one sheet.",
        targetRef: tourSessionsBtnRef,
        padding: 12,
      },
      {
        title: "Dashboard overview",
        body: "Counts for total students and upcoming accepted sessions update as you work. Use this row for a fast pulse on your caseload.",
        targetRef: tourDashboardRef,
        padding: 8,
      },
      {
        title: "Student roster",
        body: "Chips show scheduling consent with you—not full clinical triage. Tap a row to open that student in the Students tab, or use View all for the full directory.",
        targetRef: tourStudentsHeaderRef,
        padding: 8,
      },
      {
        title: "Announcements",
        body: "Post updates your students see on their Home screen, alongside school-wide notices from admins.",
        targetRef: tourAnnouncementsRef,
        padding: 8,
      },
      {
        title: "Navigate the app",
        body: "Use the bottom tabs for Home, Students, Messages, and Profile. Session History and other tools are available from Messages and profile workflows. Replay this tour anytime from the map icon beside COUNSELOR PORTAL.",
      },
    ],
    [],
  );

  const endCounselorHomeTour = useCallback(
    async (markCompleted: boolean) => {
      setShowCounselorHomeTour(false);
      if (markCompleted && user?.id) {
        try {
          await markCounselorHomeTourCompleted(user.id);
        } catch {
          /* ignore */
        }
      }
    },
    [user?.id],
  );

  const replayCounselorHomeTour = useCallback(() => {
    triggerHaptic("light");
    setShowCounselorHomeTour(true);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      counselorHomeTourAutoKeyRef.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || loading) return;
    if (counselorHomeTourAutoKeyRef.current === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        if (await isCounselorHomeTourCompleted(user.id)) {
          counselorHomeTourAutoKeyRef.current = user.id;
          return;
        }
      } catch {
        counselorHomeTourAutoKeyRef.current = user.id;
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;
      counselorHomeTourAutoKeyRef.current = user.id;
      setShowCounselorHomeTour(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

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

  useEffect(() => {
    if (!pendingSessionsModalVisible) {
      setSessionsSectionGuide(null);
    }
  }, [pendingSessionsModalVisible]);

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
  const totalStudentPages = Math.max(
    1,
    Math.ceil(recentFlags.length / STUDENTS_PAGE_SIZE),
  );
  const paginatedRecentFlags = useMemo(() => {
    const start = (studentsPage - 1) * STUDENTS_PAGE_SIZE;
    return recentFlags.slice(start, start + STUDENTS_PAGE_SIZE);
  }, [recentFlags, studentsPage]);

  useEffect(() => {
    setStudentsPage((prev) => Math.min(prev, totalStudentPages));
  }, [totalStudentPages]);

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
        const students = await firestoreService.getStudentsForCounselor(
          user?.id ?? "",
        );
        if (isCancelled?.()) return;

        setStudentCount(students.length);

        const counselorId = user?.id;
        const limit = Math.min(15, students.length);
        const rosterRows = await Promise.all(
          students.slice(0, limit).map(async (s) => {
            const student = s as Record<string, unknown>;
            const studentId = String(student.id ?? "").trim();
            if (!studentId) return null;
            try {
              let sessionStarted = false;
              let lastLogDate: Date | undefined;
              if (counselorId) {
                const settings = await getUserSettings(studentId);
                sessionStarted =
                  settings.counselorJournalAccess?.[counselorId] === true;
              }
              if (sessionStarted && counselorId) {
                const { logs } =
                  await fetchStudentCheckInSignalContextForCounselor(
                    studentId,
                    counselorId,
                  );
                const latest = logs[0] as { log_date?: Date } | undefined;
                lastLogDate = latest?.log_date;
              }
              const rosterPill: CounselorStudentRosterPill = sessionStarted
                ? "session_started"
                : "no_session_yet";
              return {
                student,
                rosterPill,
                lastLogDate,
              };
            } catch {
              return {
                student,
                rosterPill: "no_session_yet" as CounselorStudentRosterPill,
                lastLogDate: undefined as Date | undefined,
              };
            }
          }),
        );

        if (isCancelled?.()) return;

        const flags: FlagItem[] = rosterRows
          .filter(
            (row): row is NonNullable<(typeof rosterRows)[number]> => row != null,
          )
          .map(({ student, rosterPill, lastLogDate }) => ({
            id: String(student.id ?? ""),
            name:
              typeof student.full_name === "string" && student.full_name.trim()
                ? student.full_name
                : "Student",
            program:
              formatCounselorStudentSubtitle({
                department:
                  typeof student.department === "string"
                    ? student.department
                    : undefined,
                program:
                  typeof student.program === "string" ? student.program : undefined,
                year_level:
                  typeof student.year_level === "string"
                    ? student.year_level
                    : undefined,
              }) || "CCS",
            time:
              rosterPill === "session_started"
                ? lastLogDate
                  ? formatTimeAgo(new Date(lastLogDate))
                  : "No Aurora entries yet"
                : "No session with you yet",
            rosterPill,
            avatar: typeof student.avatar_url === "string" ? student.avatar_url : "",
          }))
          .sort(
            (a, b) =>
              COUNSELOR_ROSTER_PILL_SORT[a.rosterPill] -
              COUNSELOR_ROSTER_PILL_SORT[b.rosterPill],
          );

        setRecentFlags(flags);

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
              if (!dt || isNaN(dt.getTime())) return false;
              if (dt.getTime() > now) return true;
              // Still today locally — matches Session History "TODAY" until the day rolls over.
              return isSameDay(dt, new Date(now));
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
            ref={tourWelcomePortalRef}
            collapsable={false}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              minWidth: 0,
              marginRight: 8,
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
            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
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
                <TouchableOpacity
                  onPress={replayCounselorHomeTour}
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Replay counselor home tour"
                  style={{
                    padding: 5,
                    borderRadius: 10,
                    backgroundColor: "rgba(148,163,184,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.22)",
                  }}
                >
                  <MapPinned size={15} color={AURORA.textMuted} />
                </TouchableOpacity>
              </View>
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
          </View>
          <View ref={tourSessionsBtnRef} collapsable={false}>
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
        </View>

        {/* ── Scrollable Content ───────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        >
          <View ref={tourDashboardRef} collapsable={false}>
            {/* Dashboard Overview */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <LayoutDashboard size={18} color="#F59E0B" />
                <Text
                  style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}
                >
                  Dashboard Overview
                </Text>
              </View>
            </View>

            {/* Stat Cards Row 1 */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <StatCard
                icon={
                  <View
                    style={{
                      width: 38,
                      height: 38,
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
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Calendar size={18} color={AURORA.green} />
                  </View>
                }
                count={upcomingAcceptedSessions}
                label="Upcoming Sessions"
                cardBg="rgba(5,67,52,0.5)"
              />
            </View>
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

          {/* Student roster (session consent chips only) */}
          <View
            ref={tourStudentsHeaderRef}
            collapsable={false}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <GraduationCap size={18} color="#F59E0B" />
              <Text
                style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}
              >
                Students
              </Text>
            </View>
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
            <>
              {paginatedRecentFlags.map((item) => (
                <FlagRow key={item.id} item={item} />
              ))}
              {totalStudentPages > 1 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 6,
                    marginBottom: 4,
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setStudentsPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={studentsPage === 1}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      backgroundColor: AURORA.card,
                      opacity: studentsPage === 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={16} color={AURORA.textSec} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: AURORA.textMuted,
                      fontSize: 12,
                      fontWeight: "700",
                      minWidth: 86,
                      textAlign: "center",
                    }}
                  >
                    Page {studentsPage} of {totalStudentPages}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setStudentsPage((prev) =>
                        Math.min(totalStudentPages, prev + 1),
                      )
                    }
                    disabled={studentsPage === totalStudentPages}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      backgroundColor: AURORA.card,
                      opacity: studentsPage === totalStudentPages ? 0.5 : 1,
                    }}
                  >
                    <ChevronRight size={16} color={AURORA.textSec} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}

          {/* ── Announcements (dynamic, from admin/counselor) ───────── */}
          <View ref={tourAnnouncementsRef} collapsable={false}>
            <AnnouncementSection
              role="counselor"
              showAddButton
              titleIcon={<Megaphone size={18} color="#F59E0B" />}
            />
          </View>
        </ScrollView>

        <Modal
          visible={pendingSessionsModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (sessionsSectionGuide) {
              setSessionsSectionGuide(null);
            } else {
              setPendingSessionsModalVisible(false);
            }
          }}
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
                Student requests, invites, scheduled, and outcomes.
              </Text>

              {pendingSessions.length === 0 ? (
                <View style={styles.pendingEmpty}>
                  <CalendarClock size={40} color={AURORA.textMuted} />
                  <Text style={styles.pendingEmptyTitle}>All caught up</Text>
                  <Text style={styles.pendingEmptyBody}>
                    No open requests or agreed sessions to show right now.
                  </Text>
                </View>
              ) : visiblePendingSessions.length === 0 ? (
                <View style={styles.pendingEmpty}>
                  <CalendarClock size={40} color={AURORA.textMuted} />
                  <Text style={styles.pendingEmptyTitle}>Nothing visible</Text>
                  <Text style={styles.pendingEmptyBody}>
                    Every row here is hidden on this device only. Open Messages
                    or Session History for the full picture.
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
                      <View style={styles.pendingSectionHeaderRow}>
                        <Text style={styles.pendingSectionTitle}>
                          {section.title}
                        </Text>
                        {section.subtitle.trim() ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSessionsSectionGuide({
                                title: section.title,
                                body: section.subtitle,
                              })
                            }
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            style={{ padding: 2 }}
                            accessibilityRole="button"
                            accessibilityLabel={`${section.title} info`}
                          >
                            <CircleHelp size={14} color={AURORA.textSec} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
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
                            if (
                              item.category === "student_request_pending" ||
                              item.category === "counselor_invite_pending"
                            ) {
                              router.push({
                                pathname: "/(counselor)/messages",
                                params: { studentId: item.studentId },
                              });
                              return;
                            }
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
            <InfoGuideOverlay
              guide={sessionsSectionGuide}
              onClose={() => setSessionsSectionGuide(null)}
            />
          </View>
        </Modal>
      </SafeAreaView>

      <SpotlightTourOverlay
        visible={showCounselorHomeTour}
        steps={counselorHomeTourSteps}
        onRequestClose={() => void endCounselorHomeTour(true)}
        onCompleted={() => void endCounselorHomeTour(true)}
      />
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
    marginBottom: 0,
  },
  pendingSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
