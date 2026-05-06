import { AppText as Text } from "../../../src/components/common/AppText";
/**
 * Admin Dashboard - Route: /(admin)
 * Parity with web `src/pages/admin/Dashboard.tsx`: overview stats + quick actions.
 */
import React, { useCallback, useState } from "react";
import { View, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Users,
  GraduationCap,
  Clock,
  Megaphone,
  FileText,
} from "lucide-react-native";
import { useAuth } from "../../../src/stores/AuthContext";
import { AURORA } from "../../../src/constants/aurora-colors";
import { AnnouncementSection } from "../../../src/components/announcements/AnnouncementSection";
import { ADMIN_TAB_BAR_BOTTOM_CLEARANCE } from "../../../constants/admin-tab-bar";
import { firestoreService } from "../../../src/services/firebase-firestore.service";
import { announcementsService } from "../../../src/services/announcements.service";
import { AdminStatCard } from "../../../src/components/admin/AdminStatCard";
import { AdminQuickActionRow } from "../../../src/components/admin/AdminQuickActionRow";
import { isCounselorPendingApproval } from "../../../src/utils/counselorApprovalForAdmin";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "Admin";

  const [counselorCount, setCounselorCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState<number | null>(
    null,
  );
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [counselors, students, annCount] = await Promise.all([
        firestoreService.getUsersByRole("counselor"),
        firestoreService.getUsersByRole("student"),
        announcementsService.countAll(),
      ]);
      setCounselorCount(counselors.length);
      setStudentCount(students.length);
      setPendingCount(
        counselors.filter((c) =>
          isCounselorPendingApproval(c as unknown as Record<string, unknown>),
        ).length,
      );
      setAnnouncementCount(annCount);
    } catch (e) {
      console.error("Admin dashboard overview:", e);
    } finally {
      setOverviewLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOverview();
  }, [loadOverview]);

  const announcementStatDisplay =
    announcementCount === null ? "—" : announcementCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 32 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURORA.blue}
          />
        }
      >
        <Text style={styles.kicker}>Admin Portal</Text>
        <Text style={styles.greeting}>Hello, {firstName}</Text>

        <Text style={styles.sectionTitle}>Overview</Text>
        {overviewLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={AURORA.blue} />
            <Text style={styles.loadingLabel}>Loading…</Text>
          </View>
        ) : (
          <View style={styles.statColumn}>
            <View style={styles.statRow}>
              <AdminStatCard
                label="Total Counselors"
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
                label="Total Students"
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
                label="Pending Approvals"
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
                label="Announcements"
                value={announcementStatDisplay}
                icon={
                  <View
                    style={[
                      styles.statIconBg,
                      { backgroundColor: "rgba(124,58,237,0.25)" },
                    ]}
                  >
                    <Megaphone size={18} color={AURORA.purple} />
                  </View>
                }
              />
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          Quick Actions
        </Text>
        <AdminQuickActionRow
          title="Counselors"
          description="Review and approve counselor signups"
          icon={<Users size={24} color={AURORA.blue} />}
          iconContainerStyle={{ backgroundColor: "rgba(45,107,255,0.2)" }}
          onPress={() => router.push("/(admin)/counselors")}
        />
        <AdminQuickActionRow
          title="Students"
          description="Read-only roster — directory fields only"
          icon={<GraduationCap size={24} color={AURORA.green} />}
          iconContainerStyle={{ backgroundColor: "rgba(34,197,94,0.2)" }}
          onPress={() => router.push("/(admin)/students")}
        />
        <AdminQuickActionRow
          title="Announcements"
          description="Publish updates to counselors and students"
          icon={<Megaphone size={24} color={AURORA.amber} />}
          iconContainerStyle={{ backgroundColor: "rgba(254,189,3,0.2)" }}
          onPress={() => router.push("/(admin)/announcements")}
        />
        <AdminQuickActionRow
          title="Activity timeline"
          description="Logins, app usage, and admin actions"
          icon={<FileText size={22} color={AURORA.blue} />}
          iconContainerStyle={{ backgroundColor: "rgba(45,107,255,0.2)" }}
          onPress={() => router.push("/(admin)/audit-logs")}
        />

        <AnnouncementSection role="counselor" showAddButton />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: AURORA.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  greeting: {
    color: AURORA.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 22,
  },
  sectionTitle: {
    color: AURORA.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    justifyContent: "center",
  },
  loadingLabel: {
    color: AURORA.textSec,
    fontSize: 14,
  },
  statColumn: {
    gap: 10,
    marginBottom: 6,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
