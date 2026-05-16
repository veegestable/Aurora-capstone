import React, { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, Vibration, View } from "react-native";
import { AppText as Text } from "../common/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic, triggerHapticSuccess } from "../../utils/haptics";
import {
  type BreathPhase,
  type BreathingExercise,
  getCycleCountForDuration,
} from "../../features/breathing/breathing-data";
import { BreathingCircle } from "./BreathingCircle";
import {
  startBreathingAudio,
  stopBreathingAudio,
} from "../../services/breathing-audio.service";

type BreathingContainerProps = {
  exercise: BreathingExercise;
  durationSeconds: number;
  moodColor: string;
  title: string;
  subtitle?: string;
  soundscapeAsset?: number;
  soundscapeUrl?: string;
  soundscapeName?: string;
  soundscapeVolume?: number;
  useZenTheme?: boolean;
  showExitButton?: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function BreathingContainer({
  exercise,
  durationSeconds,
  moodColor,
  title,
  subtitle,
  soundscapeAsset,
  soundscapeUrl,
  soundscapeName,
  soundscapeVolume,
  useZenTheme = false,
  showExitButton = false,
  onClose,
  onComplete,
}: BreathingContainerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0);
  const lastPhaseIdRef = useRef<string>(exercise.phases[0]?.id ?? "");
  const hasCompletedRef = useRef(false);

  const totalMs = durationSeconds * 1000;
  const currentPhase: BreathPhase = exercise.phases[phaseIndex];
  const phaseDurationMs = currentPhase.seconds * 1000;
  const phaseProgress = Math.min(
    1,
    phaseElapsedMs / Math.max(1, phaseDurationMs),
  );
  const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

  const totalCycles = useMemo(
    () => getCycleCountForDuration(exercise, durationSeconds),
    [exercise, durationSeconds],
  );

  useEffect(() => {
    if (!soundscapeAsset && !soundscapeUrl) return;
    void startBreathingAudio({
      asset: soundscapeAsset,
      url: soundscapeUrl,
      targetVolume: soundscapeVolume,
    });
    return () => {
      void stopBreathingAudio();
    };
  }, [soundscapeAsset, soundscapeUrl, soundscapeVolume]);

  useEffect(() => {
    if (!isPlaying) return;
    const ticker = setInterval(() => {
      setElapsedMs((prevElapsed) => {
        const nextElapsed = prevElapsed + 250;
        return Math.min(totalMs, nextElapsed);
      });

      setPhaseElapsedMs((prev) => {
        const next = prev + 250;
        if (next >= phaseDurationMs) {
          setPhaseIndex(
            (prevPhase) => (prevPhase + 1) % exercise.phases.length,
          );
          return 0;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(ticker);
  }, [exercise.phases.length, isPlaying, onComplete, phaseDurationMs, totalMs]);

  useEffect(() => {
    if (elapsedMs < totalMs || hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsPlaying(false);
    Vibration.vibrate(350);
    triggerHapticSuccess();
    void stopBreathingAudio(3000);
    onComplete?.();
  }, [elapsedMs, onComplete, totalMs]);

  useEffect(() => {
    const phaseId = currentPhase.id;
    if (lastPhaseIdRef.current === phaseId) return;
    lastPhaseIdRef.current = phaseId;
    if (currentPhase.type === "inhale" || currentPhase.type === "exhale") {
      triggerHaptic("light");
    }
  }, [currentPhase.id, currentPhase.type]);

  const cycleLabel = `${phaseIndex + 1}/${Math.max(1, exercise.phases.length)} phases`;
  const totalCycleLabel = `${totalCycles} cycles planned`;
  const themeBg = useZenTheme ? AURORA.bgDeep : `${moodColor}16`;
  const themeAccent = useZenTheme ? AURORA.blue : moodColor;

  const handleCloseNow = () => {
    setIsPlaying(false);
    void stopBreathingAudio(0);
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeBg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 10,
            position: "relative",
          }}
        >
          <TouchableOpacity onPress={handleCloseNow} style={{ padding: 6 }}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18 }}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={{ color: "#BBD1FF", fontSize: 12 }}>{subtitle}</Text>
            )}
          </View>
          {/* <TouchableOpacity
            onPress={() => setIsPlaying((prev) => !prev)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.16)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isPlaying ? <Pause size={17} color="#FFFFFF" /> : <Play size={17} color="#FFFFFF" />}
          </TouchableOpacity> */}
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              borderRadius: 20,
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: `${themeAccent}25`,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: themeAccent, fontWeight: "700" }}>
              {exercise.name}
            </Text>
          </View>
          <BreathingCircle
            exerciseId={exercise.id}
            phase={currentPhase}
            moodColor={themeAccent}
            phaseProgress={phaseProgress}
          />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 34,
              fontWeight: "800",
              marginBottom: 4,
            }}
          >
            {currentPhase.label}
          </Text>
          <Text style={{ color: "#CFD9F8", marginBottom: 14 }}>
            {currentPhase.instruction}
          </Text>
          {!!soundscapeName && (
            <Text style={{ color: "#D8E4FF", fontSize: 12, marginBottom: 8 }}>
              Audio: {soundscapeName}
            </Text>
          )}
          <Text style={{ color: "#A8B8DF", fontSize: 12, marginBottom: 4 }}>
            {cycleLabel}
          </Text>
          <Text style={{ color: "#8EA6DA", fontSize: 12, marginBottom: 18 }}>
            {totalCycleLabel}
          </Text>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
              {remainingSeconds}s remaining
            </Text>
          </View>
          {showExitButton ? (
            <TouchableOpacity
              onPress={handleCloseNow}
              style={{
                marginTop: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.22)",
                backgroundColor: "rgba(255,255,255,0.08)",
                paddingVertical: 10,
                paddingHorizontal: 18,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}
              >
                Exit Session
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
