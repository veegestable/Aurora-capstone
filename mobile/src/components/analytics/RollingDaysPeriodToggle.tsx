import React, { useCallback, useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const TOGGLE_PAD = 3;

const ANDROID_STABILITY =
  Platform.OS === "android" ? ({ collapsable: false } as const) : {};

export type RollingDaysPeriod = 7 | 30;

type SegmentKey = "d7" | "d30";

type Props = {
  value: RollingDaysPeriod;
  onChange: (days: RollingDaysPeriod) => void;
};

export function RollingDaysPeriodToggle({ value, onChange }: Props) {
  const reduceMotion = useReducedMotion();
  const [segments, setSegments] = useState<{
    d7: { x: number; w: number };
    d30: { x: number; w: number };
  }>({ d7: { x: 0, w: 0 }, d30: { x: 0, w: 0 } });

  const thumbX = useSharedValue(0);
  const thumbW = useSharedValue(0);

  const thumbStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: TOGGLE_PAD,
    bottom: TOGGLE_PAD,
    left: TOGGLE_PAD,
    width: thumbW.value,
    transform: [{ translateX: thumbX.value }],
    backgroundColor: AURORA.purple,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  }));

  const onSegmentLayout = useCallback(
    (key: SegmentKey, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setSegments((prev) => {
        const next = { ...prev, [key]: { x, w: width } };
        if (prev[key].x === next[key].x && prev[key].w === next[key].w) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const seg = value === 7 ? segments.d7 : segments.d30;
    if (seg.w <= 0) return;
    const dur = reduceMotion ? 0 : 240;
    const easing = Easing.out(Easing.cubic);
    if (reduceMotion) {
      thumbX.value = seg.x;
      thumbW.value = seg.w;
      return;
    }
    if (Platform.OS === "android") {
      thumbW.value = seg.w;
      thumbX.value = withTiming(seg.x, { duration: dur, easing });
    } else {
      thumbW.value = withTiming(seg.w, { duration: dur, easing });
      thumbX.value = withTiming(seg.x, { duration: dur, easing });
    }
  }, [value, segments, reduceMotion, thumbX, thumbW]);

  return (
    <View
      style={{
        backgroundColor: "rgba(124, 58, 237, 0.14)",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(124, 58, 237, 0.3)",
        padding: TOGGLE_PAD,
        overflow: "hidden",
        position: "relative",
        ...(Platform.OS === "android" ? { elevation: 0 } : {}),
      }}
    >
      <Animated.View
        {...ANDROID_STABILITY}
        pointerEvents="none"
        style={thumbStyle}
      />
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {([7, 30] as const).map((days) => {
          const active = value === days;
          const layoutKey: SegmentKey = days === 7 ? "d7" : "d30";
          return (
            <TouchableOpacity
              key={days}
              onPress={() => onChange(days)}
              onLayout={(e) => onSegmentLayout(layoutKey, e)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 64,
              }}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : AURORA.textMuted,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {days} days
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
