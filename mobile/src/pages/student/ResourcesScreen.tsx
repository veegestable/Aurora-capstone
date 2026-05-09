import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { AppText as Text } from "../../components/common/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Wind } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import { BreathingContainer } from "../../components/breathing/BreathingContainer";
import {
  BREATHING_EXERCISES,
  DURATION_OPTIONS_MINUTES,
  type BreathingExercise,
  type DurationOptionMinutes,
} from "../../features/breathing/breathing-data";
import {
  clearPendingBreathingReminder,
  getPendingBreathingReminder,
  type PendingBreathingReminder,
} from "../../utils/pendingBreathingReminder";
import { useAuth } from "../../stores/AuthContext";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import {
  getDailyContext,
  setDailyContext,
} from "../../services/mood-firestore-v2.service";

export default function ResourcesScreen() {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] =
    useState<DurationOptionMinutes>(3);
  const [activeExercise, setActiveExercise] =
    useState<BreathingExercise | null>(null);
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [pendingCheckInExercise, setPendingCheckInExercise] =
    useState<PendingBreathingReminder | null>(null);
  const [suggestedQuickResetExercise, setSuggestedQuickResetExercise] =
    useState<BreathingExercise | null>(null);
  const [isSuggestedSessionVisible, setIsSuggestedSessionVisible] =
    useState(false);

  const refreshPendingReminder = useCallback(async () => {
    const pending = await getPendingBreathingReminder();
    if (
      pending &&
      !BREATHING_EXERCISES.some((e) => e.id === pending.exerciseId)
    ) {
      await clearPendingBreathingReminder();
      setPendingCheckInExercise(null);
      return;
    }
    setPendingCheckInExercise(pending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPendingReminder();
    }, [refreshPendingReminder]),
  );

  const durationSeconds = useMemo(
    () => selectedDuration * 60,
    [selectedDuration],
  );

  const pendingExerciseResolved = useMemo(() => {
    if (!pendingCheckInExercise?.exerciseId) return null;
    return (
      BREATHING_EXERCISES.find(
        (e) => e.id === pendingCheckInExercise.exerciseId,
      ) ?? null
    );
  }, [pendingCheckInExercise]);

  const openSuggestedFromCheckIn = () => {
    const ex = pendingExerciseResolved;
    if (!ex) {
      void clearPendingBreathingReminder();
      setPendingCheckInExercise(null);
      return;
    }
    triggerHaptic("light");
    setSuggestedQuickResetExercise(ex);
    setIsSuggestedSessionVisible(true);
  };

  const onSuggestedSessionComplete = async () => {
    setIsSuggestedSessionVisible(false);
    setSuggestedQuickResetExercise(null);
    await clearPendingBreathingReminder();
    setPendingCheckInExercise(null);
    const zenDayKey = calendarDayKeyLocal(new Date());
    if (user?.id) {
      try {
        const existing = await getDailyContext(user.id, zenDayKey);
        await setDailyContext(user.id, zenDayKey, {
          exams: existing?.exams || 0,
          quizzes: existing?.quizzes || 0,
          deadlines: existing?.deadlines || 0,
          assignments: existing?.assignments || 0,
          notes: existing?.notes || "",
          sleepQuality: existing?.sleepQuality,
          bathTaken: existing?.bathTaken || false,
          mealStatusById: existing?.mealStatusById || {},
          zenSessionsCompleted: (existing?.zenSessionsCompleted || 0) + 1,
          zenMinutesCompleted: (existing?.zenMinutesCompleted || 0) + 1,
        });
      } catch {
        /* no-op */
      }
    }
    Alert.alert("Nice work", "That counts toward your breathing practice.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgResources }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Modal
          visible={isSessionModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsSessionModalVisible(false)}
          onDismiss={() => setActiveExercise(null)}
        >
          {activeExercise ? (
            <BreathingContainer
              title="Zen Breathing"
              subtitle={`${selectedDuration} min session`}
              exercise={activeExercise}
              durationSeconds={durationSeconds}
              moodColor={AURORA.blue}
              soundscapeAsset={activeExercise.soundscapeAsset}
              soundscapeUrl={activeExercise.soundscapeUrl}
              soundscapeName={activeExercise.soundscapeName}
              soundscapeVolume={activeExercise.soundscapeVolume}
              useZenTheme
              showExitButton
              onClose={() => setIsSessionModalVisible(false)}
            />
          ) : null}
        </Modal>

        <Modal
          visible={isSuggestedSessionVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsSuggestedSessionVisible(false)}
        >
          {suggestedQuickResetExercise ? (
            <BreathingContainer
              title="Suggested for you"
              subtitle="60-second guided breathing from your check-in"
              exercise={suggestedQuickResetExercise}
              durationSeconds={60}
              moodColor={AURORA.blue}
              soundscapeAsset={suggestedQuickResetExercise.soundscapeAsset}
              soundscapeUrl={suggestedQuickResetExercise.soundscapeUrl}
              soundscapeName={suggestedQuickResetExercise.soundscapeName}
              soundscapeVolume={suggestedQuickResetExercise.soundscapeVolume}
              useZenTheme
              showExitButton
              onClose={() => setIsSuggestedSessionVisible(false)}
              onComplete={() => void onSuggestedSessionComplete()}
            />
          ) : null}
        </Modal>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 25, fontWeight: "800" }}>
            Zen Section
          </Text>
          <Text style={{ color: "#9CB2E2", marginTop: 4, marginBottom: 18 }}>
            Pick a breathing practice and pace your nervous system in real time.
          </Text>

          {pendingCheckInExercise && pendingExerciseResolved ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={openSuggestedFromCheckIn}
              style={{
                backgroundColor: "rgba(45,107,255,0.22)",
                borderWidth: 1,
                borderColor: "rgba(147,197,253,0.45)",
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(45,107,255,0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} color="#E0E9FF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "800",
                    fontSize: 15,
                  }}
                >
                  From your latest check-in
                </Text>
                <Text
                  style={{
                    color: "#C7D7FF",
                    fontSize: 13,
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  Tap to try{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {pendingExerciseResolved.name}
                  </Text>{" "}
                  (60s). Finishing clears this reminder.
                </Text>
              </View>
              <Text style={{ color: "#93C5FD", fontWeight: "800", fontSize: 13 }}>
                Start
              </Text>
            </TouchableOpacity>
          ) : null}

          <View
            style={{
              backgroundColor: AURORA.card,
              borderWidth: 1,
              borderColor: AURORA.border,
              borderRadius: 16,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontWeight: "700", marginBottom: 8 }}
            >
              Duration
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DURATION_OPTIONS_MINUTES.map((minutes) => {
                const selected = selectedDuration === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    onPress={() => {
                      triggerHaptic("light");
                      setSelectedDuration(minutes);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 11,
                      alignItems: "center",
                      paddingVertical: 11,
                      borderWidth: 1,
                      borderColor: selected ? AURORA.blue : AURORA.border,
                      backgroundColor: selected
                        ? "rgba(45,107,255,0.2)"
                        : AURORA.cardAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#D5E2FF" : "#AFC0E8",
                        fontWeight: "700",
                      }}
                    >
                      {minutes} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {BREATHING_EXERCISES.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              activeOpacity={0.86}
              onPress={() => {
                triggerHaptic("light");
                setActiveExercise(exercise);
                setIsSessionModalVisible(true);
              }}
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: AURORA.border,
                padding: 15,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(45,107,255,0.24)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Wind size={18} color="#9EC2FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "800",
                    }}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    style={{ color: "#B7C8ED", fontSize: 12, marginTop: 2 }}
                  >
                    {exercise.description}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                {exercise.primaryMoodTargets.map((target) => (
                  <View
                    key={`${exercise.id}-${target}`}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: "rgba(124,58,237,0.18)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#D7C6FF",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {target}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: "#9BB0DC", fontSize: 12 }}>
                Pattern:{" "}
                {exercise.phases
                  .map((phase) => `${phase.label} ${phase.seconds}s`)
                  .join(" • ")}
              </Text>
              <Text style={{ color: "#8FB4FF", fontSize: 11, marginTop: 6 }}>
                Audio: {exercise.soundscapeName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
