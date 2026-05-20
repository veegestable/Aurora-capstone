/**
 * Mirrors student mood analytics: 7- or 30-day window with highlights plus
 * frequency (donut), duration bars, and intensity bars — counselor read-only view.
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { AppText as Text } from "../common/AppText";
import { CircleHelp, PieChart, Clock3, BarChart3 } from "lucide-react-native";
import type { MoodData } from "../../services/firebase-firestore.service";
import type { MergedMoodLog } from "../../services/mood.service";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import { buildRollingDayKeySet } from "../../utils/analytics/dateKeys";
import { buildMoodChartAggregatesFromLogs } from "../../utils/analytics/moodChartAggregates";
import { MoodDistributionDonut } from "../analytics/DescriptiveCharts";
import { AURORA } from "../../constants/aurora-colors";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../common/InfoGuideModal";
import {
  CounselorStudentLast7Highlights,
  type CounselorStudentAnalyticsPeriodDays,
} from "./CounselorStudentLast7Highlights";

interface Props {
  logs: MergedMoodLog[];
}

export function CounselorStudentLast7Charts({ logs }: Props) {
  const [periodDays, setPeriodDays] =
    useState<CounselorStudentAnalyticsPeriodDays>(7);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [guide, setGuide] = useState<InfoGuideContent | null>(null);

  useEffect(() => {
    setSelectedMood(null);
  }, [periodDays]);

  const keySet = useMemo(
    () => buildRollingDayKeySet(periodDays),
    [periodDays],
  );

  const normalizedLogs = useMemo(() => {
    return logs.map((l) => ({
      ...l,
      log_date:
        l.log_date instanceof Date ? l.log_date : new Date(l.log_date as string),
    })) as Array<MoodData & { log_date: Date }>;
  }, [logs]);

  const periodLogs = useMemo(() => {
    return normalizedLogs.filter((l) =>
      keySet.has(calendarDayKeyLocal(new Date(l.log_date))),
    );
  }, [normalizedLogs, keySet]);

  const charts = useMemo(
    () => buildMoodChartAggregatesFromLogs(periodLogs),
    [periodLogs],
  );

  const frequencySegments = useMemo(
    () =>
      charts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? "" : "s"}`,
        })),
    [charts.byMood],
  );

  const durationBars = useMemo(
    () =>
      [...charts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [charts.byMood],
  );

  const intensityBars = useMemo(
    () =>
      [...charts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [charts.byMood],
  );

  const selectedSummary = selectedMood
    ? charts.byMood.find((x) => x.mood === selectedMood) ?? null
    : null;

  const chartCard = {
    backgroundColor: AURORA.cardAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AURORA.border,
  } as const;

  function SectionTitleWithInfo({
    title,
    icon,
    onInfo,
  }: {
    title: string;
    icon: React.ReactNode;
    onInfo: () => void;
  }) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          gap: 6,
        }}
      >
        {icon}
        <Text
          style={{
            color: AURORA.textPrimary,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          {title}
        </Text>
        <TouchableOpacity
          onPress={onInfo}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{ padding: 2 }}
        >
          <CircleHelp size={16} color={AURORA.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  const maxDur =
    durationBars.length > 0 ? Math.max(1, durationBars[0]?.totalMinutes ?? 1) : 1;

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <Text
          style={{
            color: "#E2E8F0",
            fontSize: 13,
            fontWeight: "800",
            letterSpacing: 0.4,
            flex: 1,
          }}
        >
          Last {periodDays} days — same charts as student analytics
        </Text>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(124, 58, 237, 0.14)",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(124, 58, 237, 0.3)",
            padding: 3,
            gap: 4,
          }}
        >
          {([7, 30] as const).map((days) => {
            const active = periodDays === days;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => setPeriodDays(days)}
                activeOpacity={0.9}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: active ? AURORA.purple : "transparent",
                }}
              >
                <Text
                  style={{
                    color: active ? "#fff" : AURORA.textMuted,
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

      <CounselorStudentLast7Highlights logs={logs} periodDays={periodDays} />

      {periodLogs.length === 0 ? (
        <View
          style={{
            backgroundColor: AURORA.cardAlt,
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: AURORA.border,
          }}
        >
          <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 20 }}>
            No mood check-ins in the last {periodDays} days — mood charts below
            will appear when this student logs.
          </Text>
        </View>
      ) : (
        <>
          <View style={chartCard}>
        <SectionTitleWithInfo
          title="MOOD FREQUENCY"
          icon={<PieChart size={14} color="#F59E0B" />}
          onInfo={() =>
            setGuide({
              title: "Mood frequency",
              body: `Share of check-ins by mood over the last ${periodDays} local calendar days.\n\nBigger slice = more check-ins for that mood.\n\nBased on count, not duration.`,
            })
          }
        />
        {/* <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 8 }}
        >
          Share of this student&apos;s check-ins by mood (last 7 days).
        </Text> */}
        <MoodDistributionDonut
          title=""
          caption=""
          segments={frequencySegments.map((x) => ({
            label: x.label,
            value: x.value,
            color: x.color,
            hint: x.hint,
          }))}
          centerValue={String(charts.totalCheckIns)}
          centerLabel={
            selectedSummary ? `${selectedSummary.label} selected` : "check-ins"
          }
          selectedSegmentLabel={selectedSummary?.label ?? null}
          onSegmentPress={(label) => {
            const moodKey =
              frequencySegments.find((x) => x.label === label)?.mood ?? null;
            if (!moodKey) return;
            setSelectedMood((prev) => (prev === moodKey ? null : moodKey));
          }}
        />
        {selectedSummary ? (
          <TouchableOpacity
            onPress={() => setSelectedMood(null)}
            style={{
              marginTop: 8,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(124,58,237,0.45)",
              backgroundColor: "rgba(124,58,237,0.16)",
            }}
          >
            <Text
              style={{
                color: AURORA.textPrimary,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              Clear highlight
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={chartCard}>
        <SectionTitleWithInfo
          title="MOOD DURATION"
          icon={<Clock3 size={14} color="#F59E0B" />}
          onInfo={() =>
            setGuide({
              title: "Mood duration",
              body: "Each check-in duration is treated as look-back time from when the student logged.\n\nOverlapping windows of the same mood are merged so minutes are not double-counted.\n\nClipped to each log’s calendar day.",
            })
          }
        />
        {/* <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 10 }}
        >
          Total minutes spent in each mood.
        </Text> */}
        {durationBars.length === 0 ? (
          <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
            No duration values in this window.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {durationBars.map((item) => {
              const widthPct = Math.max(
                10,
                Math.round((item.totalMinutes / maxDur) * 100),
              );
              return (
                <View key={`dur-${item.mood}`}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: AURORA.textMuted,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {item.totalMinutes} min
                    </Text>
                  </View>
                  <View
                    style={{
                      opacity:
                        selectedMood && selectedMood !== item.mood ? 0.38 : 1,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <View
                      style={{
                        width: `${widthPct}%`,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: item.color,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={chartCard}>
        <SectionTitleWithInfo
          title="AVERAGE INTENSITY"
          icon={<BarChart3 size={14} color="#F59E0B" />}
          onInfo={() =>
            setGuide({
              title: "Mood intensity",
              body: `Average self-reported intensity (1–10) per mood for the last ${periodDays} days.\n\nn = number of entries used for that mood.`,
            })
          }
        />
        {/* <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 10 }}
        >
          Compare moods by average intensity.
        </Text> */}
        {intensityBars.length === 0 ? (
          <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
            No intensity values in this window.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {intensityBars.map((item) => {
              const widthPct = Math.max(
                10,
                Math.round((item.averageIntensity / 10) * 100),
              );
              return (
                <View key={`int-${item.mood}`}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                      opacity:
                        selectedMood && selectedMood !== item.mood ? 0.38 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {item.label}
                    </Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.22)",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        n={item.intensitySamples}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: AURORA.textMuted,
                        fontSize: 11,
                        fontWeight: "700",
                        marginLeft: "auto",
                      }}
                    >
                      {item.averageIntensity.toFixed(1)} / 10
                    </Text>
                  </View>
                  <View
                    style={{
                      opacity:
                        selectedMood && selectedMood !== item.mood ? 0.38 : 1,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <View
                      style={{
                        width: `${widthPct}%`,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: item.color,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
        </>
      )}

      {/* <Text
        style={{
          color: AURORA.textMuted,
          fontSize: 11,
          lineHeight: 17,
          fontStyle: "italic",
          marginTop: 4,
        }}
      >
        Observational summaries from self-reported check-ins — not a clinical assessment.
      </Text> */}

      <InfoGuideModal guide={guide} onClose={() => setGuide(null)} />
    </View>
  );
}
