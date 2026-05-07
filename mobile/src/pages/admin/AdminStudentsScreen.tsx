import { AppText as Text } from "../../components/common/AppText";
/**
 * Admin — read-only student roster (directory fields only; no mood or performance).
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, GraduationCap } from "lucide-react-native";
import { firestoreService } from "../../services/firebase-firestore.service";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../../components/common/LetterAvatar";

type StudentRow = {
  id: string;
  full_name?: string;
  email?: string;
  preferred_name?: string;
  program?: string;
  year_level?: string;
  student_number?: string;
  contact_number?: string;
  department?: string;
  sex?: string;
  bio?: string;
  avatar_url?: string;
};

function Row({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: "600" }}>
        {label}
      </Text>
      <Text style={{ color: AURORA.textSec, fontSize: 13 }}>{value}</Text>
    </View>
  );
}

export default function AdminStudentsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const users = await firestoreService.getUsersByRole("student");
      setStudents(users as StudentRow[]);
    } catch (e) {
      console.error("Admin students load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: AURORA.border,
          }}
        >
          {router.canGoBack() ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 4, marginRight: 12 }}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
              Students
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 4 }}>
              Read-only directory — no mood logs or performance data.
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={AURORA.blue} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor={AURORA.blue}
              />
            }
          >
            {students.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <GraduationCap
                  size={48}
                  color={AURORA.textMuted}
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ color: AURORA.textSec, fontSize: 16 }}>
                  No students found
                </Text>
              </View>
            ) : (
              students.map((s) => {
                const name = s.full_name || "Unknown";
                return (
                  <View
                    key={s.id}
                    style={{
                      backgroundColor: AURORA.card,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      flexDirection: "row",
                      gap: 14,
                    }}
                  >
                    <LetterAvatar
                      name={name}
                      size={52}
                      avatarUrl={s.avatar_url}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {s.preferred_name ? (
                        <Text
                          style={{
                            color: AURORA.textMuted,
                            fontSize: 12,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          Preferred: {s.preferred_name}
                        </Text>
                      ) : null}
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 13,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {s.email ?? "—"}
                      </Text>
                      <Row label="Student no." value={s.student_number} />
                      <Row label="Contact no." value={s.contact_number} />
                      <Row label="Program" value={s.program} />
                      <Row label="Year" value={s.year_level} />
                      <Row label="Department" value={s.department} />
                      <Row label="Sex" value={s.sex} />
                      {s.bio ? (
                        <View style={{ marginTop: 8 }}>
                          <Text
                            style={{
                              color: AURORA.textMuted,
                              fontSize: 11,
                              fontWeight: "600",
                            }}
                          >
                            Bio
                          </Text>
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 13,
                              marginTop: 4,
                              lineHeight: 18,
                            }}
                            numberOfLines={6}
                          >
                            {s.bio}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
