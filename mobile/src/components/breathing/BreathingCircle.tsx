import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { BreathPhase } from "../../features/breathing/breathing-data";

type BreathingCircleProps = {
  exerciseId: string;
  phase: BreathPhase;
  moodColor: string;
  phaseProgress: number;
};

export function BreathingCircle({
  exerciseId,
  phase,
  moodColor,
  phaseProgress,
}: BreathingCircleProps) {
  const scaleTarget = useSharedValue(1);

  useEffect(() => {
    let target =
      phase.type === "inhale"
        ? 2
        : phase.type === "exhale"
          ? 1
          : scaleTarget.value;
    if (exerciseId === "physiological-sigh") {
      if (phase.id === "in") target = 1.8;
      if (phase.id === "in-sharp") target = 2.2;
      if (phase.id === "out") target = 1;
    }
    scaleTarget.value = withTiming(target, {
      duration: Math.max(300, phase.seconds * 1000),
      easing: Easing.inOut(Easing.quad),
    });
  }, [exerciseId, phase.id, phase.seconds, phase.type, scaleTarget]);

  const animatedStyle = useAnimatedStyle(() => {
    const glow = interpolate(scaleTarget.value, [1, 2], [0.3, 0.8]);
    return {
      transform: [{ scale: scaleTarget.value }],
      opacity: 0.85,
      shadowColor: moodColor,
      shadowOpacity: glow,
      shadowRadius: 20,
      elevation: 8,
    };
  });

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
      }}
    >
      <View
        style={{
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: moodColor,
              alignItems: "center",
              justifyContent: "center",
            },
            animatedStyle,
          ]}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "800" }}>
            {Math.max(1, Math.ceil((1 - phaseProgress) * phase.seconds))}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
