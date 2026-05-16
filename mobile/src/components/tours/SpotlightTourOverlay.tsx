import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";

export type SpotlightTourStep = {
  title: string;
  body: string;
  targetRef?: React.RefObject<View | null>;
  /** Extra padding around the highlighted region */
  padding?: number;
};

type SpotlightTourOverlayProps = {
  visible: boolean;
  steps: SpotlightTourStep[];
  onRequestClose: () => void;
  onCompleted: () => void;
};

const OVERLAY = "rgba(3,8,24,0.72)";
const HOLE_BORDER = "rgba(167,139,250,0.95)";
const ARROW = "#C4B5FD";

export function SpotlightTourOverlay({
  visible,
  steps,
  onRequestClose,
  onCompleted,
}: SpotlightTourOverlayProps) {
  const insets = useSafeAreaInsets();
  /** Android: measureInWindow Y is often short vs the translucent Modal layer (RN #19497; edge-to-edge). */
  const androidMeasureYAdjustment =
    Platform.OS === "android"
      ? (StatusBar.currentHeight ?? 0) || insets.top
      : 0;
  const { width: winW, height: winH } = Dimensions.get("window");
  const [stepIndex, setStepIndex] = useState(0);
  const [hole, setHole] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const step = steps[stepIndex];
  const hasTarget = !!(step && step.targetRef);

  const remeasure = useCallback(() => {
    const ref = step?.targetRef;
    if (!ref?.current) {
      setHole(null);
      return;
    }
    const pad = step.padding ?? 8;
    ref.current.measureInWindow((x, y, w, h) => {
      if (w <= 0 || h <= 0) {
        setHole(null);
        return;
      }
      const yAdj = y + androidMeasureYAdjustment;
      setHole({
        x: Math.max(0, x - pad),
        y: Math.max(0, yAdj - pad),
        w: Math.min(winW, w + pad * 2),
        h: Math.min(winH, h + pad * 2),
      });
    });
  }, [step, winW, winH, androidMeasureYAdjustment]);

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
      setHole(null);
      return;
    }
    if (!hasTarget) {
      setHole(null);
      return;
    }
    const id = requestAnimationFrame(() => remeasure());
    // Android can settle layout later (image/font/layout passes), so remeasure
    // a few times to keep the spotlight aligned with the final position.
    const retries = [120, 280, 520, 900].map((ms) =>
      setTimeout(() => remeasure(), ms),
    );
    return () => {
      cancelAnimationFrame(id);
      retries.forEach((t) => clearTimeout(t));
    };
  }, [visible, stepIndex, hasTarget, remeasure]);

  const cardMetrics = useMemo(() => {
    const horizontalPad = 20;
    const cardW = winW - horizontalPad * 2;
    const cardBottom = insets.bottom + 108;
    const cardMaxH = Math.min(220, winH * 0.32);
    return { horizontalPad, cardW, cardBottom, cardMaxH };
  }, [winW, winH, insets.bottom]);

  const arrowGeom = useMemo(() => {
    if (!hole || !hasTarget) return null;
    const cardLeft = cardMetrics.horizontalPad;
    const cardRight = winW - cardMetrics.horizontalPad;
    const cardTop = winH - cardMetrics.cardBottom - cardMetrics.cardMaxH;
    const cardMidX = (cardLeft + cardRight) / 2;
    const spotCx = hole.x + hole.w / 2;

    const cardAboveSpotlight = cardTop + cardMetrics.cardMaxH < hole.y;
    if (cardAboveSpotlight) {
      const x1 = cardMidX;
      const y1 = cardTop + cardMetrics.cardMaxH - 4;
      const x2 = spotCx;
      const y2 = hole.y - 6;
      if (y2 <= y1 + 12) return null;
      return { x1, y1, x2, y2 };
    }
    const x1 = cardMidX;
    const y1 = cardTop + 8;
    const x2 = spotCx;
    const y2 = hole.y + hole.h + 8;
    if (y1 >= y2 - 12) return null;
    return { x1, y1, x2, y2 };
  }, [hole, hasTarget, winH, winW, cardMetrics]);

  const advance = () => {
    triggerHaptic("light");
    if (stepIndex >= steps.length - 1) {
      onCompleted();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const skip = () => {
    triggerHaptic("light");
    onRequestClose();
  };

  if (!visible || !step) return null;

  const topH = hole ? hole.y : 0;
  const leftW = hole ? hole.x : 0;
  const midH = hole ? hole.h : 0;
  const rightLeft = hole ? hole.x + hole.w : 0;
  const bottomTop = hole ? hole.y + hole.h : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={skip}
    >
      <View style={styles.root} pointerEvents="box-none">
        {hasTarget && hole ? (
          <>
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: topH,
                backgroundColor: OVERLAY,
              }}
              pointerEvents="none"
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                width: leftW,
                top: topH,
                height: midH,
                backgroundColor: OVERLAY,
              }}
              pointerEvents="none"
            />
            <View
              style={{
                position: "absolute",
                left: rightLeft,
                right: 0,
                top: topH,
                height: midH,
                backgroundColor: OVERLAY,
              }}
              pointerEvents="none"
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: bottomTop,
                bottom: 0,
                backgroundColor: OVERLAY,
              }}
              pointerEvents="none"
            />
            <View
              pointerEvents="none"
              style={[
                styles.holeBorder,
                {
                  left: hole.x,
                  top: hole.y,
                  width: hole.w,
                  height: hole.h,
                },
              ]}
            />
          </>
        ) : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: OVERLAY }]}
          />
        )}

        {arrowGeom ? (
          <Svg
            width={winW}
            height={winH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Line
              x1={arrowGeom.x1}
              y1={arrowGeom.y1}
              x2={arrowGeom.x2}
              y2={arrowGeom.y2}
              stroke={ARROW}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Circle cx={arrowGeom.x2} cy={arrowGeom.y2} r={5} fill={ARROW} />
          </Svg>
        ) : null}

        <View
          style={[
            styles.card,
            hasTarget
              ? {
                  position: "absolute",
                  left: cardMetrics.horizontalPad,
                  right: cardMetrics.horizontalPad,
                  bottom: cardMetrics.cardBottom,
                  maxHeight: cardMetrics.cardMaxH,
                }
              : {
                  alignSelf: "center",
                  width: cardMetrics.cardW,
                  marginTop: winH * 0.22,
                },
          ]}
        >
          <Text style={styles.cardTitle}>{step.title}</Text>
          <Text style={styles.cardBody}>{step.body}</Text>
          <View style={styles.actions}>
            <Pressable onPress={skip} style={styles.skipBtn} hitSlop={8}>
              <Text style={styles.skipText}>Skip tour</Text>
            </Pressable>
            <Pressable onPress={advance} style={styles.nextBtn}>
              <Text style={styles.nextText}>
                {stepIndex >= steps.length - 1 ? "Done" : "Next"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.stepHint}>
            {stepIndex + 1} / {steps.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  holeBorder: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: HOLE_BORDER,
  },
  card: {
    backgroundColor: AURORA.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AURORA.border,
    padding: 16,
  },
  cardTitle: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardBody: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: AURORA.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  nextBtn: {
    backgroundColor: "rgba(124,58,237,0.22)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.45)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  nextText: {
    color: AURORA.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  stepHint: {
    marginTop: 10,
    alignSelf: "center",
    color: AURORA.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
});
