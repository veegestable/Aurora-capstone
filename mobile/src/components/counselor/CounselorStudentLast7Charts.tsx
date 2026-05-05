/**
 * Mirrors student “Your week” mood charts: frequency (donut), duration bars, intensity bars
 * for the last 7 local calendar days — counselor read-only view.
 */

import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CircleHelp } from "lucide-react-native";
import type { MoodData } from "../../services/firebase-firestore.service";
import type { MergedMoodLog } from "../../services/mood.service";
import { calendarDayKeyLocal } from "../../utils/dayKey";
import { buildMoodChartAggregatesFromLogs } from "../../utils/analytics/moodChartAggregates";
import { MoodDistributionDonut } from "../analytics/DescriptiveCharts";
import { AURORA } from "../../constants/aurora-colors";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../common/InfoGuideModal";
import { CounselorStressEnergyTrendChart } from "./CounselorStressEnergyTrendChart";

function last7DayKeySet(): Set<string> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const keys = new Set<string>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.add(calendarDayKeyLocal(d));
  }
  return keys;
}

interface Props {
  logs: MergedMoodLog[];
}

export function CounselorStudentLast7Charts({ logs }: Props) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [guide, setGuide] = useState<InfoGuideContent | null>(null);

  const keySet = useMemo(() => last7DayKeySet(), []);

  const last7Normalized = useMemo(() => {
    return logs.map((l) => ({
      ...l,
      log_date:
        l.log_date instanceof Date ? l.log_date : new Date(l.log_date as string),
    })) as Array<MoodData & { log_date: Date }>;
  }, [logs]);

  const last7Logs = useMemo(() => {
    return last7Normalized.filter((l) =>
      keySet.has(calendarDayKeyLocal(new Date(l.log_date))),
    );
  }, [last7Normalized, keySet]);

  const charts = useMemo(
    () => buildMoodChartAggregatesFromLogs(last7Logs),
    [last7Logs],
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
    onInfo,
  }: {
    title: string;
    onInfo: () => void;
  }) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 4,
          gap: 6,
        }}
      >
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
      <Text
        style={{
          color: "#E2E8F0",
          fontSize: 13,
          fontWeight: "800",
          letterSpacing: 0.4,
          marginBottom: 12,
        }}
      >
        Last 7 days — same charts as student analytics
      </Text>

      <CounselorStressEnergyTrendChart logs={logs} />

      {last7Logs.length === 0 ? (
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
            No mood check-ins in the last 7 days — mood charts below will appear
            when this student logs. Stress and energy bars above show grey
            placeholders on days without data.
          </Text>
        </View>
      ) : (
        <>
          <View style={chartCard}>
        <SectionTitleWithInfo
          title="Mood frequency"
          onInfo={() =>
            setGuide({
              title: "Mood frequency",
              body: "Share of check-ins by mood over the last 7 local calendar days.\n\nBigger slice = more check-ins for that mood.\n\nBased on count, not duration.",
            })
          }
        />
        <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 8 }}
        >
          Share of this student&apos;s check-ins by mood (last 7 days).
        </Text>
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
          title="Mood duration"
          onInfo={() =>
            setGuide({
              title: "Mood duration",
              body: "Each check-in duration is treated as look-back time from when the student logged.\n\nOverlapping windows of the same mood are merged so minutes are not double-counted.\n\nClipped to each log’s calendar day.",
            })
          }
        />
        <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 10 }}
        >
          Total merged retrospective minutes per mood (last 7 days).
        </Text>
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
          title="Average intensity"
          onInfo={() =>
            setGuide({
              title: "Mood intensity",
              body: "Average self-reported intensity (1–10) per mood for the last 7 days.\n\nn = number of entries used for that mood.",
            })
          }
        />
        <Text
          style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 10 }}
        >
          Compare moods by average intensity.
        </Text>
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
                          color: AURORA.textMuted,
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

      <Text
        style={{
          color: AURORA.textMuted,
          fontSize: 11,
          lineHeight: 17,
          fontStyle: "italic",
          marginTop: 4,
        }}
      >
        Observational summaries from self-reported check-ins — not a clinical assessment.
      </Text>

      <InfoGuideModal guide={guide} onClose={() => setGuide(null)} />
    </View>
  );
}
