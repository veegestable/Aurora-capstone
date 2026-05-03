/**
 * Counselor student profile: all students see a baseline mood calendar (date, time, mood only).
 * “Special population” (session request to this counselor, or student accepted counselor’s slot):
 * full journal + last-7-day charts. Special access cannot be turned off in-app yet.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react-native";
import { db } from "../../services/firebase";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../../components/common/LetterAvatar";
import { formatCounselorStudentSubtitle } from "../../constants/ccs-student-programs";
import {
  fetchStudentCounselorDetailedContext,
  fetchStudentCheckInSignalContextForCounselor,
} from "../../services/counselor-checkin-context.service";
import { firestoreService } from "../../services/firebase-firestore.service";
import { useAuth } from "../../stores/AuthContext";
import type { CounselorSignalPill } from "../../constants/counselor-checkin-signals";
import { counselorSignalFromLogs } from "../../constants/counselor-checkin-signals";
import { CounselorStudentJournalCalendar } from "../../components/counselor/CounselorStudentJournalCalendar";
import { CounselorStudentLast7Charts } from "../../components/counselor/CounselorStudentLast7Charts";

type StudentDoc = {
  full_name?: string;
  department?: string;
  program?: string;
  year_level?: string;
  avatar_url?: string;
};

export default function CounselorStudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const counselorId = user?.id;

  const [student, setStudent] = useState<(StudentDoc & { id: string }) | null>(
    null,
  );
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [journalAccessGranted, setJournalAccessGranted] = useState(false);
  const [logs, setLogs] = useState<Awaited<
    ReturnType<typeof fetchStudentCounselorDetailedContext>
  >["logs"]>([]);
  const [signalLogs, setSignalLogs] = useState<Awaited<
    ReturnType<typeof fetchStudentCheckInSignalContextForCounselor>
  >["logs"]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoadingStudent(false);
      setStudent(null);
      return;
    }
    setLoadingStudent(true);
    void (async () => {
      try {
        const ref = doc(db, "users", id);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (!snap.exists()) {
          setStudent(null);
          return;
        }
        setStudent({ id, ...(snap.data() as StudentDoc) });
      } catch {
        if (!cancelled) setStudent(null);
      } finally {
        if (!cancelled) setLoadingStudent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reloadContext = useCallback(async () => {
    if (!id || !counselorId) {
      setLoadingCtx(false);
      setLogs([]);
      return;
    }
    setLoadingCtx(true);
    try {
      const ctx = await fetchStudentCounselorDetailedContext(id, counselorId);
      setJournalAccessGranted(ctx.journalAccessGranted);
      setLogs(ctx.logs);
    } catch {
      setJournalAccessGranted(false);
      setLogs([]);
    } finally {
      setLoadingCtx(false);
    }
  }, [id, counselorId]);

  useEffect(() => {
    void reloadContext();
  }, [reloadContext]);

  useEffect(() => {
    if (!id) {
      setSignalLogs([]);
      return;
    }
    void fetchStudentCheckInSignalContextForCounselor(id).then(({ logs: lg }) => {
      setSignalLogs(lg);
    });
  }, [id]);

  const programLine =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.year_level,
    }) || "CCS";

  const signalRiskLevel: CounselorSignalPill =
    counselorSignalFromLogs(signalLogs);

  const handleInviteToSession = async () => {
    if (!counselorId || !student?.id) {
      Alert.alert("Sign in required", "Please sign in again as a counselor.");
      return;
    }
    const isAlerted =
      signalRiskLevel === "higher_self_report" ||
      signalRiskLevel === "moderate_self_report";
    const borderColor =
      signalRiskLevel === "higher_self_report"
        ? AURORA.red
        : signalRiskLevel === "moderate_self_report"
          ? AURORA.orange
          : undefined;

    setInviteBusy(true);
    try {
      await firestoreService.addConversation(
        counselorId,
        {
          id: student.id,
          name: student.full_name ?? "Student",
          avatar: student.avatar_url ?? "",
          program: programLine,
          isAlerted,
          borderColor,
        },
        { name: user?.full_name || "Counselor", avatar: user?.avatar_url },
      );
      router.push("/(counselor)/messages");
    } catch (e) {
      console.error("Invite to session failed:", e);
      Alert.alert("Could not start chat", "Please try again in a moment.");
    } finally {
      setInviteBusy(false);
    }
  };

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
        <SafeAreaView style={{ flex: 1 }}>
          <Text style={{ color: AURORA.textMuted, padding: 24 }}>
            Missing student.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const specialPopulationInfo = !journalAccessGranted ? (
    <View
      style={{
        backgroundColor: AURORA.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 10,
        }}
      >
        Mood check-ins (all students)
      </Text>
      <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21 }}>
        You can see each check-in’s date, time, and mood label below — not notes, sleep, meals,
        bath, or photos. Full journal and week charts unlock when this student is in your special
        population (they sent you a session request, or they accepted a session time you proposed).
      </Text>
    </View>
  ) : (
    <View
      style={{
        backgroundColor: AURORA.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 10,
        }}
      >
        Special population — full journal
      </Text>
      <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21 }}>
        This student unlocked full check-in detail for you. The calendar and charts below mirror
        what they see in Aurora, including notes and wellness fields. There is no in-app way for
        them to revoke this yet.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: AURORA.border,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: "800",
              marginLeft: 8,
            }}
            numberOfLines={1}
          >
            Student profile
          </Text>
        </View>

        {loadingStudent ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={AURORA.blue} size="large" />
          </View>
        ) : !student ? (
          <View style={{ padding: 24 }}>
            <Text style={{ color: AURORA.textMuted }}>
              Could not load this student.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 32,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <LetterAvatar
                name={student.full_name ?? "Student"}
                size={64}
                avatarUrl={student.avatar_url}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 20,
                    fontWeight: "800",
                  }}
                  numberOfLines={2}
                >
                  {student.full_name ?? "Student"}
                </Text>
                <Text
                  style={{
                    color: AURORA.textSec,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                  numberOfLines={3}
                >
                  {programLine}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => void handleInviteToSession()}
              disabled={inviteBusy}
              style={{
                marginTop: 18,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                backgroundColor: AURORA.blue,
                opacity: inviteBusy ? 0.7 : 1,
              }}
            >
              {inviteBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                  Invite to Session (opens chat)
                </Text>
              )}
            </TouchableOpacity>

            <Text
              style={{
                color: AURORA.textMuted,
                fontSize: 12,
                marginTop: 20,
                marginBottom: 12,
                lineHeight: 18,
              }}
            >
              Baseline view for every student; full journal only for your special population after
              session consent flows above.
            </Text>

            {loadingCtx ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={AURORA.blue} />
              </View>
            ) : (
              <>
                {specialPopulationInfo}
                {id ? (
                  <CounselorStudentJournalCalendar
                    studentId={id}
                    privacyMode={
                      journalAccessGranted ? "full" : "baseline"
                    }
                    analyticsSlot={
                      journalAccessGranted ? (
                        <CounselorStudentLast7Charts logs={logs} />
                      ) : null
                    }
                  />
                ) : null}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
