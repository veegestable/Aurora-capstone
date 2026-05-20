import { AppText as Text } from "../../components/common/AppText";
/**
 * Admin Analytics — 7-day engagement from audit_logs + roster snapshot (no mood data).
 */

import React, { useCallback, useState } from "react";
import { View, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  Users,
  GraduationCap,
  Clock,
  BarChart2,
  LogIn,
  LogOut,
  Smartphone,
  Send,
} from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";
import { ADMIN_TAB_BAR_BOTTOM_CLEARANCE } from "../../../constants/admin-tab-bar";
import { auditLogsService } from "../../services/audit-logs.service";
import { firestoreService } from "../../services/firebase-firestore.service";
import { isCounselorPendingApproval } from "../../utils/counselorApprovalForAdmin";
import type {
  EngagementSnapshot7d,
  RoleEngagementCounts,
} from "../../types/audit.types";
import { AdminStatCard } from "../../components/admin/AdminStatCard";
import { AdminCollegeCountBarChart } from "../../components/admin/AdminCollegeCountBarChart";
import { AdminCollegeProgramAnalytics } from "../../components/admin/AdminCollegeProgramAnalytics";
import { getCollegeRosterCountsSnapshot } from "../../services/admin-college-roster-analytics.service";
import type { CollegeRosterCountsSnapshot } from "../../utils/admin/collegeRosterCounts";

const ACTION_ROWS: {
  key: keyof EngagementSnapshot7d["byAction"];
  label: string;
  Icon: typeof LogIn;
}[] = [
  { key: "user_login", label: "Sign-ins", Icon: LogIn },
  { key: "user_logout", label: "Sign-outs", Icon: LogOut },
  { key: "app_active", label: "App opens / active", Icon: Smartphone },
  { key: "message_sent", label: "Chat messages sent", Icon: Send },
];

function sumRoles(c: RoleEngagementCounts): number {
  return c.counselor + c.student + c.admin + c.other;
}

function RoleRow({ label, counts }: { label: string; counts: RoleEngagementCounts }) {
  return (
    <View style={styles.roleRow}>
      <Text style={styles.roleLabel}>{label}</Text>
      <View style={styles.roleNums}>
        <Text style={styles.roleCell}>
          C <Text style={styles.roleVal}>{counts.counselor}</Text>
        </Text>
        <Text style={styles.roleCell}>
          S <Text style={styles.roleVal}>{counts.student}</Text>
        </Text>
        <Text style={styles.roleCell}>
          A <Text style={styles.roleVal}>{counts.admin}</Text>
        </Text>
        {counts.other > 0 ? (
          <Text style={styles.roleCell}>
            · <Text style={styles.roleVal}>{counts.other}</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<EngagementSnapshot7d | null>(null);
  const [counselorCount, setCounselorCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [collegeRoster, setCollegeRoster] =
    useState<CollegeRosterCountsSnapshot | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [snap, counselors, students, rosterByCollege] = await Promise.all([
        auditLogsService.getEngagementSnapshotLastDays(7, 2000),
        firestoreService.getUsersByRole("counselor"),
        firestoreService.getUsersByRole("student"),
        getCollegeRosterCountsSnapshot(),
      ]);
      setEngagement(snap);
      setCollegeRoster(rosterByCollege);
      setCounselorCount(counselors.length);
      setStudentCount(students.length);
      setPendingCount(
        counselors.filter((c) =>
          isCounselorPendingApproval(c as unknown as Record<string, unknown>),
        ).length,
      );
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const windowLabel =
    engagement?.windowStart && engagement?.windowEnd
      ? `${engagement.windowStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} – ${engagement.windowEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : "";

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  const capped = engagement && engagement.fetchedRowCount >= 2000;

  const totalTracked7d =
    engagement == null
      ? null
      : ACTION_ROWS.reduce(
          (acc, { key }) => acc + sumRoles(engagement.byAction[key]),
          0,
        );

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <BarChart2 size={22} color={AURORA.blue} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.sub}>
              Engagement (audit trail) + roster — no mood data.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AURORA.blue} />
          </View>
        ) : error ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: AURORA.red }}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 24 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={AURORA.blue}
              />
            }
          >
            <Text style={styles.meta}>
              Last updated: {updatedLabel}
            </Text>

            <Text style={styles.section}>Roster</Text>
            <View style={styles.statRow}>
              <AdminStatCard
                label="Counselors"
                value={counselorCount}
                icon={
                  <View
                    style={[
                      styles.statIconBg,
                      { backgroundColor: "rgba(45,107,255,0.2)" },
                    ]}
                  >
                    <Users size={18} color={AURORA.blue} />
                  </View>
                }
              />
              <AdminStatCard
                label="Students"
                value={studentCount}
                icon={
                  <View
                    style={[
                      styles.statIconBg,
                      { backgroundColor: "rgba(34,197,94,0.2)" },
                    ]}
                  >
                    <GraduationCap size={18} color={AURORA.green} />
                  </View>
                }
              />
            </View>
            <View style={styles.statRow}>
              <AdminStatCard
                label="Pending approvals"
                value={pendingCount}
                accent={pendingCount > 0}
                icon={
                  <View
                    style={[
                      styles.statIconBg,
                      { backgroundColor: "rgba(254,189,3,0.2)" },
                    ]}
                  >
                    <Clock size={18} color={AURORA.amber} />
                  </View>
                }
              />
              <AdminStatCard
                label="Tracked events (7d)"
                value={totalTracked7d === null ? "—" : totalTracked7d}
                icon={
                  <View
                    style={[
                      styles.statIconBg,
                      { backgroundColor: "rgba(124,58,237,0.25)" },
                    ]}
                  >
                    <BarChart2 size={18} color={AURORA.purple} />
                  </View>
                }
              />
            </View>

            {collegeRoster ? (
              <>
                <Text style={[styles.section, { marginTop: 8 }]}>
                  Roster by college
                </Text>
                <Text style={styles.hintSmall}>
                  COE, CSM, CCS, CED, CASS, CEBA, CHS — scroll charts if needed.
                  {collegeRoster.unassignedStudents > 0
                    ? ` ${collegeRoster.unassignedStudents} student(s) have no college set.`
                    : ""}
                </Text>
                <AdminCollegeCountBarChart
                  title="Students per college"
                  caption="All active student accounts grouped by college code."
                  points={collegeRoster.studentsByCollege}
                  barColor={AURORA.green}
                />
                <AdminCollegeCountBarChart
                  title="Special population per college"
                  caption={`${collegeRoster.totalSpecialPopulation} student(s) have guidance session consent with at least one counselor (journal access granted).`}
                  points={collegeRoster.specialPopulationByCollege}
                  barColor={AURORA.purple}
                  emptyHint="No students in special population yet."
                />
                <Text style={[styles.hintSmall, { marginBottom: 8 }]}>
                  {COLLEGE_LEGEND}
                </Text>
                <AdminCollegeProgramAnalytics roster={collegeRoster} />
              </>
            ) : null}

            <Text style={[styles.section, { marginTop: 8 }]}>
              Last 7 days — engagement
            </Text>
            <Text style={styles.windowHint}>{windowLabel}</Text>
            {engagement ? (
              <Text style={styles.hintSmall}>
                {engagement.eventsInWindow} audit rows in date window · scanned{" "}
                {engagement.fetchedRowCount} newest rows from Firestore
              </Text>
            ) : null}
            {capped ? (
              <Text style={styles.warn}>
                Fetch limit reached (2000 rows). Totals may miss older events in
                this week — see Activity timeline for raw stream.
              </Text>
            ) : null}

            {engagement &&
              ACTION_ROWS.map(({ key, label, Icon }) => {
                const counts = engagement.byAction[key];
                const total = sumRoles(counts);
                return (
                  <View key={key} style={styles.card}>
                    <View style={styles.cardHead}>
                      <View
                        style={[
                          styles.miniIcon,
                          { backgroundColor: "rgba(45,107,255,0.2)" },
                        ]}
                      >
                        <Icon size={16} color={AURORA.blue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{label}</Text>
                        <Text style={styles.cardTotal}>Total: {total}</Text>
                      </View>
                    </View>
                    <Text style={styles.legend}>
                      C = counselor · S = student · A = admin
                    </Text>
                    <RoleRow label="By role" counts={counts} />
                  </View>
                );
              })}

            <Text style={[styles.hintSmall, { marginTop: 16 }]}>
              Based on audit log actions only. Roles come from each event’s
              performer.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const COLLEGE_LEGEND =
  "COE Engineering · CSM Science & Math · CCS Computer Studies · CED Education · CASS Arts & Social Sciences · CEBA Economics, Business & Accountancy · CHS Health Services";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURORA.border,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  sub: {
    color: AURORA.textSec,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  meta: {
    color: AURORA.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 4,
  },
  section: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  windowHint: {
    color: AURORA.textSec,
    fontSize: 13,
    marginBottom: 6,
  },
  hintSmall: {
    color: AURORA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  warn: {
    color: AURORA.amber,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: AURORA.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: AURORA.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardTotal: {
    color: AURORA.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  legend: {
    color: AURORA.textMuted,
    fontSize: 10,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  roleLabel: {
    color: AURORA.textSec,
    fontSize: 12,
    fontWeight: "600",
  },
  roleNums: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
  },
  roleCell: {
    color: AURORA.textMuted,
    fontSize: 12,
  },
  roleVal: {
    color: AURORA.textPrimary,
    fontWeight: "800",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
