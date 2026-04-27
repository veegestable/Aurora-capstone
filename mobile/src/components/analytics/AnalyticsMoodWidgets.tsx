import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Easing,
} from 'react-native';
import type { MoodData } from '../../services/firebase-firestore.service';
import { getDayKey } from '../../utils/dayKey';
import { moodLogsToMoodEntries } from '../../utils/moodEntryNormalize';
import { aggregateByDay, moodStabilityScore } from '../../utils/moodAggregates';
import { blendColors } from '../../utils/blendColors';
import { AURORA } from '../../constants/aurora-colors';
import { getEmotionLabel } from '../../utils/moodColors';
import {
  energyCategoryLabelFromFive,
  stressCategoryLabelFromFive,
} from '../../utils/analytics/metricCategories';

const UI_TEXT_SECONDARY = '#C1CEE9';
const UI_TEXT_MUTED = '#9AA9C8';

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

function AnimatedBar({ height, color, delay, animateKey }: { height: number; color: string; delay: number; animateKey: string }) {
  const h = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    h.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(h, {
        toValue: height,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [h, height, delay, animateKey]);
  return <Animated.View style={{ height: h, backgroundColor: color, borderRadius: 4 }} />;
}

export function AnalyticsMoodWidgets({ logs, resetHour, timezone }: Props) {
  const [period, setPeriod] = useState<'week' | 'last30'>('week');
  const [metric, setMetric] = useState<'stress' | 'energy'>('stress');
  const [tip, setTip] = useState<{ label: string; text: string; emotion?: string; color?: string } | null>(null);
  const [chartW, setChartW] = useState(300);
  const [last30ZoomScale, setLast30ZoomScale] = useState(1);
  const toggleAnim = useMemo(() => new Animated.Value(0), []);

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

  const weekBarData = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return weekSlots.map(({ key, label }) => ({
      label,
      key,
      agg: aggregateByDay(entries, key),
    }));
  }, [entries, weekSlots]);
  const weekWithDataCount = useMemo(
    () => weekBarData.filter((b) => b.agg.entryCount > 0).length,
    [weekBarData]
  );

  const last30BarData = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const rows: { label: string; key: string; date: Date; agg: ReturnType<typeof aggregateByDay> }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDayKey(d, resetHour, timezone);
      const label = d.getDate() === 1 || i === 29 ? `${d.getMonth() + 1}/${d.getDate()}` : String(d.getDate());
      rows.push({ label, key, date: d, agg: aggregateByDay(entries, key) });
    }
    return rows;
  }, [entries, resetHour, timezone]);

  const last30WithDataCount = useMemo(
    () => last30BarData.filter((d) => d.agg.entryCount > 0).length,
    [last30BarData]
  );
  const last30AvgStress = useMemo(() => {
    const withData = last30BarData.filter((d) => d.agg.entryCount > 0);
    if (withData.length === 0) return null;
    const sum = withData.reduce((acc, d) => acc + d.agg.avgStress, 0);
    return sum / withData.length;
  }, [last30BarData]);
  const last30AvgEnergy = useMemo(() => {
    const withData = last30BarData.filter((d) => d.agg.entryCount > 0);
    if (withData.length === 0) return null;
    const sum = withData.reduce((acc, d) => acc + d.agg.avgEnergy, 0);
    return sum / withData.length;
  }, [last30BarData]);
  const last30MonthStarts = useMemo(
    () =>
      last30BarData
        .map((d, i) => ({ i, date: d.date }))
        .filter(({ i, date }) => i === 0 || date.getDate() === 1)
        .map(({ i, date }) => ({
          index: i,
          label: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        })),
    [last30BarData]
  );
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

  const nBars = weekBarData.length;
  const gap = 3;
  const barW = Math.max(5, (chartW - 24 - gap * (nBars - 1)) / nBars);
  const showDenseLast30Labels = last30ZoomScale >= 1.6;
  const toggleTrackWidth = 154;
  const toggleThumbWidth = 72;

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: period === 'week' ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [period, toggleAnim]);

  useEffect(() => {
    // Prevent stale selected-day details from carrying across period/metric switches.
    setTip(null);
  }, [period, metric]);

  const toggleLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, toggleTrackWidth - toggleThumbWidth - 3],
  });

  return (
    <View style={{ marginTop: 8 }}>
      {/* Widget A */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700' }}>Mood stability</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
            TIME RANGE
          </Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(124, 58, 237, 0.14)',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(124, 58, 237, 0.3)',
              padding: 3,
              gap: 4,
              width: toggleTrackWidth,
              position: 'relative',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 3,
                left: toggleLeft,
                width: toggleThumbWidth,
                height: 30,
                borderRadius: 999,
                backgroundColor: AURORA.purple,
              }}
            />
            <TouchableOpacity
              onPress={() => setPeriod('week')}
              activeOpacity={0.9}
              style={{
                width: toggleThumbWidth,
                paddingVertical: 6,
                borderRadius: 999,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: period === 'week' ? '#fff' : AURORA.textMuted, fontWeight: '700', fontSize: 12 }}>
                7 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPeriod('last30')}
              activeOpacity={0.9}
              style={{
                width: toggleThumbWidth,
                paddingVertical: 6,
                borderRadius: 999,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: period === 'last30' ? '#fff' : AURORA.textMuted, fontWeight: '700', fontSize: 12 }}>
                30 days
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View
        style={{
          backgroundColor: AURORA.card,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: AURORA.border,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 42, fontWeight: '900', color: stability.blended }}>{stability.score}%</Text>
        <Text style={{ color: AURORA.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 }}>Mood Stability</Text>
        <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
          {stabilityCopy(stability.score)}
        </Text>
      </View>

      {/* Widget B */}
      <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 6 }}>
        METRIC
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
        <TouchableOpacity
          onPress={() => setMetric('stress')}
          activeOpacity={0.9}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: metric === 'stress' ? 'rgba(124,58,237,0.18)' : 'transparent',
            borderWidth: metric === 'stress' ? 1 : 0,
            borderColor: metric === 'stress' ? 'rgba(124,58,237,0.45)' : 'transparent',
          }}
        >
          <Text style={{ color: metric === 'stress' ? AURORA.textPrimary : UI_TEXT_MUTED, fontSize: 13, fontWeight: '800' }}>
            😵 Stress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMetric('energy')}
          activeOpacity={0.9}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: metric === 'energy' ? 'rgba(124,58,237,0.18)' : 'transparent',
            borderWidth: metric === 'energy' ? 1 : 0,
            borderColor: metric === 'energy' ? 'rgba(124,58,237,0.45)' : 'transparent',
          }}
        >
          <Text style={{ color: metric === 'energy' ? AURORA.textPrimary : UI_TEXT_MUTED, fontSize: 13, fontWeight: '800' }}>
            ⚡ Energy
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 }}>
          {metric === 'stress' ? 'Daily stress trend' : 'Daily energy trend'}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: AURORA.card,
          borderRadius: 16,
          padding: 12,
          marginBottom: 20,
        }}
        onLayout={onChartLayout}
      >
        {period === 'week' ? (
          weekWithDataCount < 2 ? (
            <View
              style={{
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: 'rgba(148,163,184,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(148,163,184,0.24)',
              }}
            >
              <Text style={{ color: AURORA.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                Not enough data yet for a trend line
              </Text>
              <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12, lineHeight: 18 }}>
                You currently have {weekWithDataCount} day{weekWithDataCount === 1 ? '' : 's'} with data in this range. Add at least one more check-in day to compare trend changes.
              </Text>
            </View>
          ) : (
          <>
            <ScrollView horizontal={false} showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartH, gap }}>
                {weekBarData.map((b, i) => {
                  const maxH = chartH - 20;
                  const has = b.agg.entryCount > 0;
                  const score = metric === 'stress' ? b.agg.avgStress : b.agg.avgEnergy;
                  const h = has ? Math.max(8, (score / 5) * maxH) : 8;
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
                          label: b.key
                            ? new Date(b.key).toLocaleDateString('en-US', { weekday: 'long' })
                            : b.label,
                          text: `${
                            metric === 'stress'
                              ? stressCategoryLabelFromFive(b.agg.avgStress)
                              : energyCategoryLabelFromFive(b.agg.avgEnergy)
                          } · ${b.agg.entryCount} check-in${b.agg.entryCount === 1 ? '' : 's'}`,
                          emotion: b.agg.dominantMood && b.agg.dominantMood !== '—' ? b.agg.dominantMood : undefined,
                          color: b.agg.blendedColor,
                        });
                      }}
                      style={{ width: barW, height: chartH, justifyContent: 'flex-end' }}
                    >
                      <AnimatedBar
                        height={h}
                        color={fill}
                        delay={Math.min(220, i * 24)}
                        animateKey={`week-${period}-${b.key}`}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap, marginTop: 6 }}>
              {weekBarData.map((b, i) => (
                <Text
                  key={`lbl-${i}`}
                  style={{
                    color: UI_TEXT_MUTED,
                    fontSize: 10,
                    width: barW,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {b.label}
                </Text>
              ))}
            </View>
            {tip ? (
              <View
                style={{
                  marginTop: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: 'rgba(91, 117, 255, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(91, 117, 255, 0.28)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 12, fontWeight: '700', flexShrink: 1 }}>
                      {tip.label}
                    </Text>
                    {tip.emotion ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        
                        <Text style={{ fontSize: 11, fontWeight: '800' }}>
                          <Text style={{ color: AURORA.textMuted }}>Dominant Mood: </Text>
                          <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: tip.color || AURORA.purple,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.45)',
                            marginRight: 4,
                          }}
                        />
                          <Text style={{ color: AURORA.textPrimary }}>{getEmotionLabel(tip.emotion)}</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {tip.text.split('·').map((part) => (
                    <View
                      key={`${tip.label}-${part.trim()}`}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: 'rgba(124, 58, 237, 0.28)',
                        borderWidth: 1,
                        borderColor: 'rgba(124, 58, 237, 0.55)',
                      }}
                    >
                      <Text style={{ color: AURORA.textPrimary, fontSize: 11, fontWeight: '700' }}>
                        {part.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
          )
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              minimumZoomScale={1}
              maximumZoomScale={3}
              pinchGestureEnabled
              bouncesZoom
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const z = e.nativeEvent.zoomScale ?? 1;
                setLast30ZoomScale(z);
              }}
              scrollEventThrottle={16}
            >
              <View style={{ width: Math.max(520, chartW + 120), position: 'relative' }}>
                {last30MonthStarts.map((m) => (
                  <Text
                    key={`wm-${m.index}-${m.label}`}
                    style={{
                      position: 'absolute',
                      left: m.index * (14 + gap),
                      top: 28,
                      color: 'rgba(148,163,184,0.18)',
                      fontSize: 18,
                      fontWeight: '900',
                      letterSpacing: 1.2,
                    }}
                  >
                    {m.label}
                  </Text>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartH, gap }}>
                  {last30BarData.map((b, i) => {
                    const maxH = chartH - 20;
                    const has = b.agg.entryCount > 0;
                    const score = metric === 'stress' ? b.agg.avgStress : b.agg.avgEnergy;
                    const h = has ? Math.max(8, (score / 5) * maxH) : 8;
                    const fill = has ? b.agg.blendedColor : 'rgba(148,163,184,0.35)';
                    const isMonthStart = b.date.getDate() === 1;
                    const isFirst = i === 0;
                    return (
                      <View key={`${b.key}-${i}`} style={{ width: 14, height: chartH, justifyContent: 'flex-end', position: 'relative' }}>
                        {(isMonthStart && !isFirst) ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: -Math.round(gap / 2),
                              top: 0,
                              bottom: 0,
                              width: 1,
                              backgroundColor: 'rgba(148,163,184,0.45)',
                            }}
                          />
                        ) : null}
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            if (!has) {
                              setTip({
                                label: b.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                text: 'No data',
                              });
                              return;
                            }
                            setTip({
                              label: b.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                              text: `${
                                metric === 'stress'
                                  ? stressCategoryLabelFromFive(b.agg.avgStress)
                                  : energyCategoryLabelFromFive(b.agg.avgEnergy)
                              } · ${b.agg.entryCount} check-in${b.agg.entryCount === 1 ? '' : 's'}`,
                              emotion: b.agg.dominantMood && b.agg.dominantMood !== '—' ? b.agg.dominantMood : undefined,
                              color: b.agg.blendedColor,
                            });
                          }}
                          style={{ width: 14, height: chartH, justifyContent: 'flex-end' }}
                        >
                          <AnimatedBar
                            height={h}
                            color={fill}
                            delay={Math.min(220, i * 10)}
                            animateKey={`last30-${period}-${b.key}`}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap, marginTop: 6 }}>
                  {last30BarData.map((b, i) => (
                    <View key={`lbl30-${i}`} style={{ width: 14, alignItems: 'center' }}>
                      <Text
                        style={{
                          color: AURORA.textMuted,
                          fontSize: 8,
                          width: 14,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {showDenseLast30Labels || i % 3 === 0 || b.date.getDate() === 1 ? b.label : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(91, 117, 255, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(91, 117, 255, 0.3)',
                }}
              >
                <Text style={{ color: AURORA.textPrimary, fontSize: 11, fontWeight: '700' }}>
                  {last30WithDataCount > 0
                    ? `${last30WithDataCount}/30 logged`
                    : 'No check-ins in the last 30 days yet'}
                </Text>
              </View>
              {last30WithDataCount > 0 ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(124, 58, 237, 0.18)',
                    borderWidth: 1,
                    borderColor: 'rgba(124, 58, 237, 0.35)',
                  }}
                >
                  <Text style={{ color: AURORA.textPrimary, fontSize: 11, fontWeight: '700' }}>
                    {metric === 'stress'
                      ? `Stress level: ${stressCategoryLabelFromFive(last30AvgStress)}`
                      : `Energy level: ${energyCategoryLabelFromFive(last30AvgEnergy)}`}
                  </Text>
                </View>
              ) : null}
            </View>
            {tip ? (
              <View
                style={{
                  marginTop: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: 'rgba(91, 117, 255, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(91, 117, 255, 0.28)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 12, fontWeight: '700', flexShrink: 1 }}>
                      {tip.label}
                    </Text>
                    {tip.emotion ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        
                        <Text style={{ fontSize: 11, fontWeight: '800' }}>
                          <Text style={{ color: AURORA.textMuted }}>Dominant Mood: </Text>
                          <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: tip.color || AURORA.purple,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.45)',
                            marginRight: 4,
                          }}
                        />
                          <Text style={{ color: AURORA.textPrimary }}>{getEmotionLabel(tip.emotion)}</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {tip.text.split('·').map((part) => (
                    <View
                      key={`${tip.label}-${part.trim()}`}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: 'rgba(124, 58, 237, 0.28)',
                        borderWidth: 1,
                        borderColor: 'rgba(124, 58, 237, 0.55)',
                      }}
                    >
                      <Text style={{ color: AURORA.textPrimary, fontSize: 11, fontWeight: '700' }}>
                        {part.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

    </View>
  );
}
