import { AppText as Text } from "../../components/common/AppText";
/**
 * Counselor student profile: all students see a baseline mood calendar (date, time, mood only).
 * “Special population” (session request to this counselor, or student accepted counselor’s slot):
 * full journal + last-7-day charts. Special access cannot be turned off in-app yet.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  Mail,
  Phone,
  CircleHelp,
  Hash,
  User,
  VenusAndMars,
} from "lucide-react-native";
import { db } from "../../services/firebase";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../../components/common/LetterAvatar";
import { formatCounselorStudentSubtitle } from "../../constants/ccs-student-programs";
import { fetchStudentCounselorDetailedContext } from "../../services/counselor-checkin-context.service";
import { firestoreService } from "../../services/firebase-firestore.service";
import { useAuth } from "../../stores/AuthContext";
import { CounselorStudentJournalCalendar } from "../../components/counselor/CounselorStudentJournalCalendar";
import { CounselorStudentLast7Charts } from "../../components/counselor/CounselorStudentLast7Charts";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../components/common/InfoGuideModal";

type StudentDoc = {
  full_name?: string;
  sex?: string;
  student_number?: string;
  email?: string;
  contact_number?: string;
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
  const [inviteBusy, setInviteBusy] = useState(false);
  const [sessionOutcomeCounts, setSessionOutcomeCounts] = useState<{
    completed: number;
    missed: number;
  }>({ completed: 0, missed: 0 });
  const [activeGuide, setActiveGuide] = useState<InfoGuideContent | null>(null);

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
      setSessionOutcomeCounts({ completed: 0, missed: 0 });
      return;
    }
    setLoadingCtx(true);
    try {
      const ctx = await fetchStudentCounselorDetailedContext(id, counselorId);
      setJournalAccessGranted(ctx.journalAccessGranted);
      setLogs(ctx.logs);
      if (ctx.journalAccessGranted) {
        const counts =
          await firestoreService.getSessionOutcomeCountsForCounselorStudent(
            counselorId,
            id,
          );
        setSessionOutcomeCounts(counts);
      } else {
        setSessionOutcomeCounts({ completed: 0, missed: 0 });
      }
    } catch {
      setJournalAccessGranted(false);
      setLogs([]);
      setSessionOutcomeCounts({ completed: 0, missed: 0 });
    } finally {
      setLoadingCtx(false);
    }
  }, [id, counselorId]);

  useEffect(() => {
    void reloadContext();
  }, [reloadContext]);

  const programLine =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.year_level,
    }) || "CCS";

  const handleInviteToSession = async () => {
    if (!counselorId || !student?.id) {
      Alert.alert("Sign in required", "Please sign in again as a counselor.");
      return;
    }
    setInviteBusy(true);
    try {
      await firestoreService.addConversation(
        counselorId,
        {
          id: student.id,
          name: student.full_name ?? "Student",
          avatar: student.avatar_url ?? "",
          program: programLine,
        },
        { name: user?.full_name || "Counselor", avatar: user?.avatar_url },
      );
      router.push({
        pathname: "/(counselor)/messages",
        params: { studentId: student.id },
      });
    } catch (e) {
      console.error("Invite to session failed:", e);
      Alert.alert("Could not start chat", "Please try again in a moment.");
    } finally {
      setInviteBusy(false);
    }
  };

  const openInfoModal = (title: string, body: string) => {
    setActiveGuide({ title, body });
  };

  const showSpecialPopulationInfo = () => {
    openInfoModal(
      "Special Population",
      "This student unlocked full check-in detail for you. The calendar and charts below mirror what they see in Aurora, including notes and wellness fields. There is no in-app way for them to revoke this yet.",
    );
  };
  const showMoodCheckinsInfo = () => {
    openInfoModal(
      "Mood check-ins",
      "You can see each check-in's date, time, and mood label below - not notes, sleep, meals, bath, or photos. Full journal and week charts unlock when this student is in your special population (they sent you a session request, or they accepted a session time you proposed).",
    );
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "800",
          }}
        >
          Mood check-ins
        </Text>
        <TouchableOpacity
          onPress={showMoodCheckinsInfo}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ padding: 2 }}
          accessibilityRole="button"
          accessibilityLabel="Mood check-ins info"
        >
          <CircleHelp size={16} color={AURORA.textSec} />
        </TouchableOpacity>
      </View>
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "800",
          }}
        >
          Special Population
        </Text>
        <TouchableOpacity
          onPress={showSpecialPopulationInfo}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ padding: 2 }}
          accessibilityRole="button"
          accessibilityLabel="Special population info"
        >
          <CircleHelp size={16} color={AURORA.textSec} />
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: AURORA.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            COMPLETED SESSIONS
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: "900",
            }}
          >
            {sessionOutcomeCounts.completed}
          </Text>
          <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 4 }}>
            Marked completed
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            MISSED SESSIONS
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: "900",
            }}
          >
            {sessionOutcomeCounts.missed}
          </Text>
          <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 4 }}>
            No-show or marked missed
          </Text>
        </View>
      </View>
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 6,
                  }}
                >
                  <VenusAndMars size={13} color="#BFD2FF" />
                  <Text
                    style={{
                      flex: 1,
                      color: "#C9D8FF",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {student.sex?.trim() || "No sex provided"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 6,
                  }}
                >
                  <User size={13} color="#BFD2FF" />
                  <Text
                    style={{
                      flex: 1,
                      color: "#C9D8FF",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {student.student_number?.trim() || "No student ID provided"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 6,
                  }}
                >
                  <Mail size={13} color="#BFD2FF" />
                  <Text
                    style={{
                      flex: 1,
                      color: "#C9D8FF",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {student.email?.trim() || "No email provided"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 6,
                  }}
                >
                  <Phone size={13} color="#BFD2FF" />
                  <Text
                    style={{
                      flex: 1,
                      color: "#C9D8FF",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {student.contact_number?.trim() || "No contact number"}
                  </Text>
                </View>
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
                  Invite to Session
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
              Full journal only for your special population after
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
        <InfoGuideModal guide={activeGuide} onClose={() => setActiveGuide(null)} />
      </SafeAreaView>
    </View>
  );
}
