/**
 * Rolling-window summary widgets for counselor special-population analytics —
 * mirrors student 7- / 30-day highlights (stats, dominant mood, stability/trend).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { AppText as Text } from "../common/AppText";
import { CircleHelp } from "lucide-react-native";
import type { MoodData } from "../../services/firebase-firestore.service";
import type { MergedMoodLog } from "../../services/mood.service";
import { AURORA } from "../../constants/aurora-colors";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import {
  buildRollingDayKeySet,
  calculateHighestCheckInStreakInWindow,
} from "../../utils/analytics/dateKeys";
import {
  buildMoodChartAggregatesFromLogs,
  pickDominantMoodFromAggregates,
} from "../../utils/analytics/moodChartAggregates";
import { getMoodIconSource } from "../../utils/moodIconAssets";
import { AnalyticsMoodWidgets } from "../analytics/AnalyticsMoodWidgets";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../common/InfoGuideModal";

const UI_TEXT_MUTED = "#9AA9C8";

export type CounselorStudentAnalyticsPeriodDays = 7 | 30;

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dominantMoodAccentColor(label: string, fallback: string): string {
  const key = label.toLowerCase().trim();
  if (key === "happy" || key === "happiness" || key === "joy")
    return AURORA.moodHappy;
  if (key === "sad" || key === "sadness") return AURORA.moodSad;
  if (key === "angry" || key === "anger") return AURORA.moodAngry;
  if (key === "neutral") return AURORA.moodNeutral;
  if (key === "surprise" || key === "surprised") return AURORA.moodSurprise;
  return fallback;
}

type WeekPillKey = "days" | "checkins" | "streak";

type Props = {
  logs: MergedMoodLog[];
  periodDays: CounselorStudentAnalyticsPeriodDays;
};

export function CounselorStudentLast7Highlights({
  logs,
  periodDays,
}: Props) {
  const [activePill, setActivePill] = useState<WeekPillKey | null>(null);
  const [guide, setGuide] = useState<InfoGuideContent | null>(null);
  const moodWidgetsPeriod = periodDays === 30 ? "last30" : "week";

  useEffect(() => {
    setActivePill(null);
  }, [periodDays]);

  const periodDayKeySet = useMemo(
    () => buildRollingDayKeySet(periodDays),
    [periodDays],
  );

  const normalizedLogs = useMemo(
    () =>
      logs.map((l) => ({
        ...l,
        log_date:
          l.log_date instanceof Date
            ? l.log_date
            : new Date(l.log_date as string),
      })) as Array<MoodData & { log_date: Date }>,
    [logs],
  );

  const periodLogs = useMemo(
    () =>
      normalizedLogs.filter((l) =>
        periodDayKeySet.has(calendarDayKeyLocal(new Date(l.log_date))),
      ),
    [normalizedLogs, periodDayKeySet],
  );

  const periodDaysLogged = useMemo(() => {
    const keysWithData = new Set<string>();
    for (const log of periodLogs) {
      keysWithData.add(calendarDayKeyLocal(new Date(log.log_date)));
    }
    return keysWithData.size;
  }, [periodLogs]);

  const periodTotalCheckIns = periodLogs.length;

  const bestStreak = useMemo(
    () =>
      calculateHighestCheckInStreakInWindow(
        normalizedLogs,
        periodDays,
        new Date(),
      ),
    [normalizedLogs, periodDays],
  );

  const moodCharts = useMemo(
    () => buildMoodChartAggregatesFromLogs(periodLogs),
    [periodLogs],
  );

  const dominantMood = useMemo(
    () => pickDominantMoodFromAggregates(moodCharts.byMood),
    [moodCharts.byMood],
  );

  const dominantLabel = dominantMood?.label ?? "Not enough check-ins";
  const dominantColor = dominantMoodAccentColor(
    dominantLabel,
    dominantMood?.color ?? AURORA.blue,
  );

  const pills: Array<{ key: WeekPillKey; label: string; value: string }> = [
    {
      key: "days",
      label: "Days logged",
      value: `${periodDaysLogged}/${periodDays}`,
    },
    {
      key: "checkins",
      label: "Check-ins",
      value: String(periodTotalCheckIns),
    },
    {
      key: "streak",
      label: "Best streak",
      value: String(bestStreak),
    },
  ];

  const explainer =
    activePill === "days"
      ? `This student logged on ${periodDaysLogged} of the last ${periodDays} days.`
      : activePill === "checkins"
        ? `${periodTotalCheckIns} mood check-in${periodTotalCheckIns === 1 ? "" : "s"} in the last ${periodDays} days.`
        : activePill === "streak"
          ? `Longest consecutive logging streak in this window: ${bestStreak} day${bestStreak === 1 ? "" : "s"}.`
          : null;

  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 14 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          {pills.map((pill) => (
            <TouchableOpacity
              key={pill.key}
              activeOpacity={0.9}
              onPress={() =>
                setActivePill((prev) => (prev === pill.key ? null : pill.key))
              }
              style={{
                width: 113,
                backgroundColor:
                  activePill === pill.key
                    ? "rgba(45, 107, 255, 0.18)"
                    : "rgba(15, 24, 64, 0.88)",
                padding: 13,
                borderRadius: 18,
                borderWidth: 1,
                borderColor:
                  activePill === pill.key ? AURORA.blue : AURORA.border,
                shadowColor: activePill === pill.key ? AURORA.blue : "#000",
                shadowOpacity: activePill === pill.key ? 0.28 : 0.18,
                shadowRadius: activePill === pill.key ? 10 : 8,
                shadowOffset: { width: 0, height: 6 },
                elevation: activePill === pill.key ? 5 : 3,
              }}
            >
              <Text
                style={{
                  color: UI_TEXT_MUTED,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.7,
                }}
              >
                {pill.label.toUpperCase()}
              </Text>
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontSize: 24,
                  fontWeight: "900",
                  marginTop: 8,
                }}
              >
                {pill.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {explainer ? (
        <View
          style={{
            backgroundColor: "rgba(45, 107, 255, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(45, 107, 255, 0.28)",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 17 }}
          >
            {explainer}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          width: "100%",
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: hexToRgba(dominantColor, 0.14),
          padding: 20,
          borderWidth: 1.5,
          borderColor: hexToRgba(dominantColor, 0.75),
          marginBottom: 16,
          ...(Platform.OS === "ios"
            ? {
                shadowColor: dominantColor,
                shadowOpacity: 0.26,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 10 },
              }
            : { elevation: 0 }),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              color: AURORA.textPrimary,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.6,
            }}
          >
            MOST FREQUENT MOOD
          </Text>
          <TouchableOpacity
            onPress={() =>
              setGuide({
                title: "Most frequent mood",
                body: `The mood this student logged most often in the last ${periodDays} days.\n\nUses the same count as the Mood frequency chart below (logged mood per check-in, not face-detection alone). Ties use total logged duration.`,
              })
            }
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={{ padding: 2 }}
          >
            <CircleHelp size={14} color={UI_TEXT_MUTED} />
          </TouchableOpacity>
        </View>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 16,
            paddingBottom: 4,
            gap: 10,
          }}
        >
          {periodTotalCheckIns > 0 ? (
            <Image
              source={getMoodIconSource(dominantLabel)}
              style={{ width: 56, height: 56 }}
              resizeMode="contain"
              accessibilityLabel={dominantLabel}
            />
          ) : null}
          <Text
            style={{
              color: AURORA.textPrimary,
              fontSize: 28,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {dominantLabel}
          </Text>
        </View>
      </View>

      {periodTotalCheckIns > 0 ? (
        <AnalyticsMoodWidgets logs={periodLogs} period={moodWidgetsPeriod} />
      ) : (
        <View
          style={{
            backgroundColor: AURORA.cardAlt,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: AURORA.border,
          }}
        >
          <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 20 }}>
            No mood check-ins in the last {periodDays} days — stability and
            stress/energy trends will appear when this student logs.
          </Text>
        </View>
      )}

      <InfoGuideModal guide={guide} onClose={() => setGuide(null)} />
    </View>
  );
}
