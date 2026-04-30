import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wind } from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import { BreathingContainer } from "../../components/breathing/BreathingContainer";
import {
  BREATHING_EXERCISES,
  DURATION_OPTIONS_MINUTES,
  type BreathingExercise,
  type DurationOptionMinutes,
} from "../../features/breathing/breathing-data";

export default function ResourcesScreen() {
  const [selectedDuration, setSelectedDuration] = useState<DurationOptionMinutes>(3);
  const [activeExercise, setActiveExercise] = useState<BreathingExercise | null>(null);
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);

  const durationSeconds = useMemo(() => selectedDuration * 60, [selectedDuration]);

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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 25, fontWeight: "800" }}>Zen Section</Text>
          <Text style={{ color: "#9CB2E2", marginTop: 4, marginBottom: 18 }}>
            Pick a breathing practice and pace your nervous system in real time.
          </Text>

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
            <Text style={{ color: "#FFFFFF", fontWeight: "700", marginBottom: 8 }}>Duration</Text>
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
                      backgroundColor: selected ? "rgba(45,107,255,0.2)" : AURORA.cardAlt,
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
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
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
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>{exercise.name}</Text>
                  <Text style={{ color: "#B7C8ED", fontSize: 12, marginTop: 2 }}>{exercise.description}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
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
                    <Text style={{ color: "#D7C6FF", fontSize: 11, fontWeight: "700" }}>{target}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: "#9BB0DC", fontSize: 12 }}>
                Pattern: {exercise.phases.map((phase) => `${phase.label} ${phase.seconds}s`).join(" • ")}
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
