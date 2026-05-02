/**
 * Last 7 calendar days — average daily stress vs energy as rounded vertical bars (counselor view).
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Battery, CircleHelp, Flame } from "lucide-react-native";
import type { MoodData } from "../../services/firebase-firestore.service";
import type { MergedMoodLog } from "../../services/mood.service";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import { AURORA } from "../../constants/aurora-colors";
import { getEmotionLabel } from "../../utils/moodColors";
import { moodLogsToMoodEntries } from "../../utils/moodEntryNormalize";
import { aggregateByDay } from "../../utils/moodAggregates";
import {
  energyCategoryLabelFromFive,
  stressCategoryLabelFromFive,
} from "../../utils/analytics/metricCategories";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../common/InfoGuideModal";

const CHART_INNER_HEIGHT = 132;
const MIN_BAR_PCT = 11;
const MAX_BAR_PCT = 100;

type TrendMode = "stress" | "energy";

function slotDefs(): Array<{ dayKey: string; weekdayShort: string }> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const out: Array<{ dayKey: string; weekdayShort: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayKey = calendarDayKeyLocal(d);
    const weekdayShort = d.toLocaleDateString("en-US", { weekday: "short" });
    out.push({ dayKey, weekdayShort });
  }
  return out;
}

function bucketLogsByDayKey(
  logs: Array<MoodData & { log_date: Date }>,
): Map<string, Array<MoodData & { log_date: Date }>> {
  const m = new Map<string, Array<MoodData & { log_date: Date }>>();
  for (const log of logs) {
    const dk = calendarDayKeyLocal(new Date(log.log_date));
    const arr = m.get(dk);
    if (arr) arr.push(log);
    else m.set(dk, [log]);
  }
  return m;
}

function avgField(
  logs: Array<MoodData & { log_date: Date }>,
  field: "stress_level" | "energy_level",
): number | null {
  let sum = 0;
  let n = 0;
  for (const log of logs) {
    const v = log[field];
    if (typeof v === "number" && !Number.isNaN(v)) {
      sum += Math.min(10, Math.max(1, v));
      n += 1;
    }
  }
  if (n === 0) return null;
  return sum / n;
}

function stressBarColor(avg: number): string {
  const v = (avg - 1) / 9;
  if (v < 0.28) return "rgba(100,116,139,0.85)";
  if (v < 0.42) return "#EAB308";
  if (v < 0.58) return "#FBBF24";
  if (v < 0.72) return "#F59E0B";
  if (v < 0.86) return "#F97316";
  return "#EF4444";
}

function energyBarColor(avg: number): string {
  const v = (avg - 1) / 9;
  if (v < 0.3) return "rgba(71,85,105,0.85)";
  if (v < 0.45) return "#CA8A04";
  if (v < 0.62) return "#EAB308";
  if (v < 0.78) return "#FACC15";
  return "#FDE047";
}

function formatDayKeyWeekday(dayKey: string): string {
  const [yRaw, mRaw, dRaw] = dayKey.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  const d = Number(dRaw);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return dayKey;
  }
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

interface Props {
  logs: MergedMoodLog[];
}

export function CounselorStressEnergyTrendChart({ logs }: Props) {
  const [mode, setMode] = useState<TrendMode>("stress");
  const [guide, setGuide] = useState<InfoGuideContent | null>(null);
  const [tip, setTip] = useState<{
    label: string;
    text: string;
    emotion?: string;
    color?: string;
    dayKey?: string;
  } | null>(null);

  useEffect(() => {
    setTip(null);
  }, [mode]);

  const normalizedLogs = useMemo(() => {
    return logs.map((l) => ({
      ...l,
      log_date:
        l.log_date instanceof Date ? l.log_date : new Date(l.log_date as string),
    })) as Array<MoodData & { log_date: Date }>;
  }, [logs]);

  const slots = useMemo(() => slotDefs(), []);
  const slotKeys = useMemo(() => new Set(slots.map((s) => s.dayKey)), [slots]);

  const logsInWindow = useMemo(
    () =>
      normalizedLogs.filter((l) =>
        slotKeys.has(calendarDayKeyLocal(new Date(l.log_date))),
      ),
    [normalizedLogs, slotKeys],
  );

  const byDay = useMemo(
    () => bucketLogsByDayKey(logsInWindow),
    [logsInWindow],
  );
  const entries = useMemo(() => moodLogsToMoodEntries(logsInWindow), [logsInWindow]);
  const dailyAggregates = useMemo(() => {
    const out = new Map<string, ReturnType<typeof aggregateByDay>>();
    for (const { dayKey } of slots) {
      out.set(dayKey, aggregateByDay(entries, dayKey));
    }
    return out;
  }, [entries, slots]);

  const series = useMemo(() => {
    const field = mode === "stress" ? "stress_level" : "energy_level";
    return slots.map(({ dayKey, weekdayShort }) => {
      const dayLogs = byDay.get(dayKey) ?? [];
      const avg = avgField(dayLogs, field);
      const heightPct =
        avg == null
          ? MIN_BAR_PCT
          : MIN_BAR_PCT +
            ((avg / 10) * (MAX_BAR_PCT - MIN_BAR_PCT));
      const color =
        avg == null
          ? "rgba(148,163,184,0.22)"
          : mode === "stress"
            ? stressBarColor(avg)
            : energyBarColor(avg);
      return { dayKey, weekdayShort, avg, heightPct, color };
    });
  }, [slots, byDay, mode]);

  const title =
    mode === "stress"
      ? "Stress Trend (Bar Chart)"
      : "Energy Trend (Bar Chart)";

  return (
    <View
      style={{
        backgroundColor: AURORA.cardAlt,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: AURORA.textPrimary,
            fontSize: 16,
            fontWeight: "700",
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <TouchableOpacity
          onPress={() =>
            setGuide({
              title:
                mode === "stress"
                  ? "Stress trend"
                  : "Energy trend",
              body:
                mode === "stress"
                  ? "Each bar is the average daily stress level from self-reported check-ins.\n\nTap a bar to view the day label, stress category, numeric level, dominant mood, and check-in count.\n\nStress level bands (1-5):\n- 1.0 to 1.8: Very calm\n- 1.9 to 2.6: Normal\n- 2.7 to 3.5: Stressed\n- 3.6 to 5.0: Very stressed\n\nGrey bars mean no check-ins that day.\nObservational only, not a clinical score."
                  : "Each bar is the average daily energy level from self-reported check-ins.\n\nTap a bar to view the day label, energy category, numeric level, dominant mood, and check-in count.\n\nEnergy level bands (1-5):\n- 1.0 to 1.8: Very low energy\n- 1.9 to 2.6: Low energy\n- 2.7 to 3.5: Steady energy\n- 3.6 to 5.0: High energy\n\nGrey bars mean no check-ins that day.",
            })
          }
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ padding: 4 }}
        >
          <CircleHelp size={18} color={AURORA.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setMode("stress")}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            borderWidth: 1,
            borderColor:
              mode === "stress"
                ? "rgba(139,92,246,0.75)"
                : "rgba(255,255,255,0.08)",
            backgroundColor:
              mode === "stress"
                ? "rgba(124,58,237,0.22)"
                : "transparent",
          }}
        >
          <Flame
            size={14}
            color={mode === "stress" ? "#F59E0B" : "rgba(245,158,11,0.72)"}
          />
          <Text
            style={{
              color:
                mode === "stress" ? AURORA.textPrimary : AURORA.textMuted,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            Stress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("energy")}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            borderWidth: 1,
            borderColor:
              mode === "energy"
                ? "rgba(250,204,21,0.55)"
                : "rgba(255,255,255,0.08)",
            backgroundColor:
              mode === "energy"
                ? "rgba(250,204,21,0.14)"
                : "transparent",
          }}
        >
          <Battery
            size={14}
            color={mode === "energy" ? "#FACC15" : "rgba(250,204,21,0.72)"}
          />
          <Text
            style={{
              color:
                mode === "energy" ? AURORA.textPrimary : AURORA.textMuted,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            Energy
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          color: AURORA.textSec,
          fontSize: 12,
          marginBottom: 14,
          lineHeight: 18,
        }}
      >
        Average daily level across the last 7 days.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: CHART_INNER_HEIGHT + 22,
          gap: 6,
        }}
      >
        {series.map(({ dayKey, weekdayShort, heightPct, color }) => (
          <View
            key={dayKey}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const agg = dailyAggregates.get(dayKey);
                const has = Boolean(agg && agg.entryCount > 0);
                if (!has) {
                  setTip({
                    label: formatDayKeyWeekday(dayKey),
                    text: "No data",
                    dayKey,
                  });
                  return;
                }
                const scoreLabel =
                  mode === "stress"
                    ? stressCategoryLabelFromFive(agg.avgStress)
                    : energyCategoryLabelFromFive(agg.avgEnergy);
                const levelValue = mode === "stress" ? agg.avgStress : agg.avgEnergy;
                setTip({
                  label: formatDayKeyWeekday(dayKey),
                  text: `${scoreLabel} · Level ${levelValue.toFixed(1)}/5 · ${agg.entryCount} check-in${agg.entryCount === 1 ? "" : "s"}`,
                  emotion:
                    agg.dominantMood && agg.dominantMood !== "—"
                      ? agg.dominantMood
                      : undefined,
                  color: agg.blendedColor,
                  dayKey,
                });
              }}
              style={{
                width: "100%",
                maxWidth: 44,
                height: CHART_INNER_HEIGHT,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: "88%",
                  height: `${Math.round(heightPct)}%`,
                  borderRadius: 8,
                  backgroundColor: color,
                  borderWidth: tip?.dayKey === dayKey ? 1 : 0,
                  borderColor:
                    tip?.dayKey === dayKey
                      ? "rgba(255,255,255,0.45)"
                      : "transparent",
                  minHeight: 6,
                }}
              />
            </TouchableOpacity>
            <Text
              style={{
                marginTop: 8,
                color: AURORA.textMuted,
                fontSize: 11,
                fontWeight: "600",
              }}
              numberOfLines={1}
            >
              {weekdayShort}
            </Text>
          </View>
        ))}
      </View>

      {tip ? (
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: "rgba(91, 117, 255, 0.16)",
            borderWidth: 1,
            borderColor: "rgba(91, 117, 255, 0.28)",
          }}
        >
          <Text
            style={{
              color: AURORA.textPrimary,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {tip.label}
          </Text>
          {tip.emotion ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                Dominant mood
              </Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: tip.color || AURORA.purple,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.45)",
                }}
              />
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {getEmotionLabel(tip.emotion)}
              </Text>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            {tip.text.split("·").map((part) => (
              <View
                key={`${tip.label}-${part.trim()}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: "rgba(124, 58, 237, 0.28)",
                  borderWidth: 1,
                  borderColor: "rgba(124, 58, 237, 0.55)",
                }}
              >
                <Text
                  style={{
                    color: AURORA.textPrimary,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {part.trim()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <InfoGuideModal guide={guide} onClose={() => setGuide(null)} />
    </View>
  );
}
