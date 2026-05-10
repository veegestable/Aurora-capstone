import { AppText as Text } from "../common/AppText";
/**
 * DashboardSessionRequestModal — pick counselor on Wellness/dashboard, then continue in Messages.
 * Preferred time + note are collected only via StudentSessionRequestModal (same as Request session in chat)
 * so only one session request message is created.
 */

import React, { useState, useEffect } from "react";
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { X, ArrowRight } from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../common/LetterAvatar";
import { firestoreService } from "../../services/firebase-firestore.service";
import { counselorHasJournalAccessForCounselor } from "../../services/mood-firestore-v2.service";
import { isCounselorSelectableByStudent } from "../../utils/counselorApprovalForAdmin";

interface Counselor {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

interface DashboardSessionRequestModalProps {
  visible: boolean;
  studentId: string;
  studentName?: string;
  studentAvatar?: string;
  onClose: () => void;
  onSuccess: (payload: { counselorId: string }) => void;
}

export default function DashboardSessionRequestModal({
  visible,
  studentId,
  onClose,
  onSuccess,
}: DashboardSessionRequestModalProps) {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (visible) {
      setLoading(true);
      firestoreService
        .getUsersByRole("counselor")
        .then((users) =>
          setCounselors(
            (users || []).filter((u) =>
              isCounselorSelectableByStudent(u as Record<string, unknown>),
            ) as Counselor[],
          ),
        )
        .catch(() => setCounselors([]))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const navigateToMessagesSessionRequest = () => {
    if (!selectedCounselorId || busy) return;
    setBusy(true);
    try {
      onSuccess({ counselorId: selectedCounselorId });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleContinuePress = async () => {
    if (!selectedCounselorId || busy) return;
    try {
      const hasAccess = await counselorHasJournalAccessForCounselor(
        studentId,
        selectedCounselorId,
      );
      if (!hasAccess) {
        const label =
          counselors.find((c) => c.id === selectedCounselorId)?.full_name ??
          "this counselor";
        Alert.alert(
          "Continue to session request",
          `You'll choose your preferred time and a note next (same form as Messages → Request session). If you continue, ${label} may review your mood check-ins and journals in Aurora after you send the request. Only continue if you genuinely want help.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () => navigateToMessagesSessionRequest(),
            },
          ],
        );
        return;
      }
      navigateToMessagesSessionRequest();
    } catch (e) {
      console.error("Session request check failed:", e);
      const msg =
        e instanceof Error ? e.message : "Please try again in a moment.";
      Alert.alert("Something went wrong", msg);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Request a Session</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <X size={24} color={AURORA.textSec} />
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Choose your counselor here. Next you'll open Messages with the same
              preferred time and note form used when you tap Request session in
              chat — only one request is sent after you confirm there.
            </Text>

            <Text style={styles.label}>Select Counselor</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={AURORA.blue} />
              </View>
            ) : counselors.length === 0 ? (
              <Text style={styles.emptyText}>No counselors available.</Text>
            ) : (
              <ScrollView
                style={styles.counselorList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {counselors.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.counselorRow,
                      selectedCounselorId === c.id &&
                        styles.counselorRowSelected,
                    ]}
                    onPress={() => setSelectedCounselorId(c.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ marginRight: 12 }}>
                      <LetterAvatar
                        name={c.full_name ?? "Counselor"}
                        size={44}
                        avatarUrl={c.avatar_url}
                      />
                    </View>
                    <View style={styles.counselorInfo}>
                      <Text style={styles.counselorName}>
                        {c.full_name || "Counselor"}
                      </Text>
                    </View>
                    {selectedCounselorId === c.id && (
                      <View style={styles.check}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.sendBtn,
                !selectedCounselorId && styles.sendBtnDisabled,
              ]}
              onPress={() => void handleContinuePress()}
              disabled={!selectedCounselorId || busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>Continue in Messages</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: AURORA.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: AURORA.border,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: "85%",
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  hint: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  label: {
    color: AURORA.textSec,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  loadingRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: AURORA.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  counselorList: {
    maxHeight: 220,
    marginBottom: 20,
  },
  counselorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: AURORA.cardDark,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  counselorRowSelected: {
    borderColor: AURORA.blue,
  },
  counselorInfo: {
    flex: 1,
  },
  counselorName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AURORA.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: AURORA.blue,
    borderRadius: 14,
    paddingVertical: 14,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
