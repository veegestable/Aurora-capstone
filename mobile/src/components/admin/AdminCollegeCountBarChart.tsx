import { AppText as Text } from "../common/AppText";
/**
 * Single-series horizontal-scroll bar chart for admin college breakdowns.
 */

import { Fragment } from "react";
import { View, ScrollView } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { AURORA } from "../../constants/aurora-colors";
export type RosterCountBarPoint = {
  key: string;
  label: string;
  count: number;
};

const CHART_H = 200;
const PAD = { l: 44, r: 14, t: 20, b: 8 };
const DEFAULT_X_SLOT = 54;

type Props = {
  title: string;
  caption: string;
  points: RosterCountBarPoint[];
  barColor?: string;
  emptyHint?: string;
  xSlot?: number;
};

export function AdminCollegeCountBarChart({
  title,
  caption,
  points,
  barColor = AURORA.blue,
  emptyHint = "No students in this group yet.",
  xSlot = DEFAULT_X_SLOT,
}: Props) {
  const values = points.map((p) => p.count);
  const max = Math.max(1, ...values);
  const n = values.length;
  const innerW = Math.max(1, (n - 1) * xSlot);
  const W = PAD.l + innerW + PAD.r;
  const innerH = CHART_H - PAD.t - PAD.b;
  const barW = Math.min(28, xSlot - 8);
  const xAt = (i: number) => PAD.l + i * xSlot;
  const allZero = values.every((v) => v === 0);

  return (
    <View
      style={{
        backgroundColor: AURORA.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: AURORA.textPrimary,
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: AURORA.textSec,
          fontSize: 12,
          lineHeight: 17,
          marginBottom: 12,
        }}
      >
        {caption}
      </Text>

      {allZero ? (
        <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>{emptyHint}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <Svg width={W} height={CHART_H}>
              <Line
                x1={PAD.l}
                y1={PAD.t + innerH}
                x2={PAD.l + innerW}
                y2={PAD.t + innerH}
                stroke={AURORA.borderLight}
                strokeWidth={1.2}
              />
              {values.map((t, i) => {
                const h = t === 0 ? 0 : Math.max(6, (t / max) * innerH);
                const cx = xAt(i);
                const bx = cx - barW / 2;
                const y = PAD.t + innerH - h;
                return (
                  <Fragment key={points[i]?.key ?? i}>
                    <Rect
                      x={bx}
                      y={y}
                      width={barW}
                      height={h}
                      fill={barColor}
                      opacity={t === 0 ? 0.2 : 0.9}
                      rx={4}
                      ry={4}
                    />
                    {t > 0 ? (
                      <SvgText
                        x={cx}
                        y={y - 4}
                        fill={AURORA.textSec}
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {String(t)}
                      </SvgText>
                    ) : null}
                  </Fragment>
                );
              })}
            </Svg>
            <View
              style={{ width: W, height: 44, marginTop: 4, position: "relative" }}
            >
              {points.map((p, i) => (
                <View
                  key={p.key}
                  style={{
                    position: "absolute",
                    left: xAt(i) - xSlot / 2,
                    width: xSlot,
                    top: 0,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: AURORA.textPrimary,
                      fontSize: 11,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    {p.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
