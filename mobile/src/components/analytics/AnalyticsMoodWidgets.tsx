import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import type { MoodData } from '../../services/firebase-firestore.service';
import { getDayKey } from '../../utils/dayKey';
import { moodLogsToMoodEntries } from '../../utils/moodEntryNormalize';
import { aggregateByDay, moodStabilityScore } from '../../utils/moodAggregates';
import { blendColors } from '../../utils/blendColors';
import { AURORA } from '../../constants/aurora-colors';

function contrastText(bgHex: string): string {
  const h = bgHex.replace('#', '');
  if (h.length < 6) return '#0f172a';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0f172a' : '#f8fafc';
}

function stabilityCopy(score: number): string {
  if (score >= 80) return 'Very stable — your mood has been consistent';
  if (score >= 60) return 'Mostly stable — a few noticeable shifts';
  if (score >= 40) return 'Some fluctuation this period';
  return 'High variability — your mood shifted a lot';
}

type Props = {
  logs: (MoodData & { log_date: Date })[];
  resetHour: number;
  timezone: string;
};

export function AnalyticsMoodWidgets({ logs, resetHour, timezone }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [tip, setTip] = useState<{ label: string; text: string } | null>(null);
  const [chartW, setChartW] = useState(300);

  const entries = useMemo(
    () => moodLogsToMoodEntries(logs, resetHour, timezone),
    [logs, resetHour, timezone]
  );

  const weekSlots = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const out: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push({
        key: getDayKey(d, resetHour, timezone),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return out;
  }, [resetHour, timezone]);

  const weekStripData = useMemo(() => {
    return weekSlots.map(({ key, label }) => {
      const agg = aggregateByDay(entries, key);
      const moodShort =
        agg.dominantMood && agg.dominantMood !== '—' ? agg.dominantMood.slice(0, 6) : '—';
      return { key, label, agg, moodShort };
    });
  }, [entries, weekSlots]);

  const glanceSentence = useMemo(() => {
    const withData = weekStripData.filter((x) => x.agg.entryCount > 0);
    if (withData.length === 0) return '';
    let best = withData[0];
    let hard = withData[0];
    for (const x of withData) {
      if (x.agg.avgIntensity > best.agg.avgIntensity) best = x;
      const hRank = -x.agg.avgIntensity + x.agg.avgStress;
      const hardRank = -hard.agg.avgIntensity + hard.agg.avgStress;
      if (hRank > hardRank) hard = x;
    }
    return `You felt best on ${best.label} and most stressed on ${hard.label}.`;
  }, [weekStripData]);

  const barData = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (period === 'week') {
      return weekSlots.map(({ key, label }) => ({
        label,
        key,
        agg: aggregateByDay(entries, key),
      }));
    }
    const rows: { label: string; agg: ReturnType<typeof aggregateByDay>; key: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDayKey(d, resetHour, timezone);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      rows.push({ label, key, agg: aggregateByDay(entries, key) });
    }
    return rows;
  }, [entries, period, resetHour, timezone, weekSlots]);

  const stability = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    if (period === 'week') start.setDate(start.getDate() - 7);
    else start.setDate(start.getDate() - 30);
    const slice = entries.filter((e) => e.timestamp >= start && e.timestamp <= end);
    const intensities = slice.map((e) => e.intensity);
    const score = moodStabilityScore(intensities);
    const blended =
      slice.length > 0
        ? blendColors(slice.map((x) => ({ color: x.color, intensity: x.intensity })))
        : AURORA.blue;
    return { score, blended };
  }, [entries, period]);

  const chartH = 120;
  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setChartW(w);
  };

  const nBars = barData.length;
  const gap = 3;
  const barW = Math.max(5, (chartW - 24 - gap * (nBars - 1)) / nBars);

  return (
    <View style={{ marginTop: 8 }}>
      {/* Widget C */}
      <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>
        Your week at a glance
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
          {weekStripData.map((cell) => {
            const bg =
              cell.agg.entryCount > 0 ? cell.agg.blendedColor : 'rgba(148,163,184,0.35)';
            return (
              <View
                key={cell.key}
                style={{
                  minWidth: 72,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 14,
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                }}
              >
                <Text style={{ color: contrastText(bg), fontSize: 11, fontWeight: '800' }}>{cell.label}</Text>
                <Text
                  style={{ color: contrastText(bg), fontSize: 12, fontWeight: '600', marginTop: 4 }}
                  numberOfLines={1}
                >
                  {cell.moodShort}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      {glanceSentence ? (
        <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
          {glanceSentence}
        </Text>
      ) : null}

      {/* Widget B */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 }}>
          {period === 'week' ? 'Your daily mood this week' : 'Your daily mood this month'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setPeriod('week')}>
            <Text style={{ color: period === 'week' ? AURORA.blue : AURORA.textMuted, fontWeight: '700' }}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPeriod('month')}>
            <Text style={{ color: period === 'month' ? AURORA.blue : AURORA.textMuted, fontWeight: '700' }}>Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          backgroundColor: AURORA.card,
          borderRadius: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: AURORA.border,
          marginBottom: 20,
        }}
        onLayout={onChartLayout}
      >
        <ScrollView horizontal={period === 'month'} showsHorizontalScrollIndicator={period === 'month'}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartH, gap }}>
            {barData.map((b, i) => {
              const maxH = chartH - 20;
              const has = b.agg.entryCount > 0;
              const h = has ? Math.max(8, (b.agg.avgIntensity / 10) * maxH) : 8;
              const fill = has ? b.agg.blendedColor : 'rgba(148,163,184,0.35)';
              return (
                <TouchableOpacity
                  key={`${b.key}-${i}`}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!has) {
                      setTip({ label: b.label, text: 'No data' });
                      return;
                    }
                    setTip({
                      label: b.label,
                      text: `${b.agg.dominantMood} · avg intensity ${b.agg.avgIntensity.toFixed(1)} · ${b.agg.entryCount} check-in${b.agg.entryCount === 1 ? '' : 's'}`,
                    });
                  }}
                  style={{ width: barW, height: chartH, justifyContent: 'flex-end' }}
                >
                  <View style={{ height: h, backgroundColor: fill, borderRadius: 4 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <ScrollView horizontal={period === 'month'} showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap, marginTop: 6 }}>
            {barData.map((b, i) => (
              <Text
                key={`lbl-${i}`}
                style={{
                  color: AURORA.textMuted,
                  fontSize: 9,
                  width: barW,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            ))}
          </View>
        </ScrollView>
        {tip ? (
          <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 8 }}>
            {tip.label}: {tip.text}
          </Text>
        ) : null}
      </View>

      {/* Widget A */}
      <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Mood stability</Text>
      <View
        style={{
          backgroundColor: AURORA.card,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: AURORA.border,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 42, fontWeight: '900', color: stability.blended }}>{stability.score}%</Text>
        <Text style={{ color: AURORA.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 }}>Mood Stability</Text>
        <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
          {stabilityCopy(stability.score)}
        </Text>
      </View>
    </View>
  );
}
