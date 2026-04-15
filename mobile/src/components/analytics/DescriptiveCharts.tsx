/**
 * Student-friendly charts: larger layout, plain-language axes, light grids.
 * Copy stays observational (no causation).
 */

import type { ReactElement } from 'react';
import { Fragment, useEffect } from 'react';
import { View, Text, useWindowDimensions, ScrollView } from 'react-native';
import Svg, { Circle, Line, Rect, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import * as Animatable from 'react-native-animatable';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AURORA } from '../../constants/aurora-colors';
import type { DailyChartPoint } from '../../utils/analytics/chartSeries';
import { moodStripFillForScale } from '../../utils/analytics/chartSeries';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DEFAULT_H = 200;
const PAD_BASE = { l: 44, r: 14, t: 20, b: 8 };
/** Horizontal space per day so date labels ("Mar 14") are never clipped. */
const X_SLOT = 54;

export const ETHICS_ANALYTICS_FOOTER =
    'Nothing here diagnoses you or guesses what comes next.';

export interface FriendlyAxisLabels {
    /** Shown near the top of the chart (high values). */
    high: string;
    /** Shown in the middle. */
    mid: string;
    /** Shown near the bottom (low values). */
    low: string;
}

interface LineTrendProps {
    title: string;
    /** One short sentence under the title (student-facing). */
    caption: string;
    values: (number | null)[];
    labels: string[];
    yMin: number;
    yMax: number;
    stroke: string;
    formatY?: (v: number) => string;
    friendlyAxis?: FriendlyAxisLabels;
    chartHeight?: number;
    fitToWidth?: boolean;
    labelEvery?: number;
    xSlot?: number;
    zoomable?: boolean;
}

const TREND_LEGEND = '● Logged day     ○ No check-in that day';
const TREND_GAP_NOTE = 'Only days you checked in are shown. Gaps mean no log was recorded.';

export function LineTrendChart({
    title,
    caption,
    values,
    labels,
    yMin,
    yMax,
    stroke,
    formatY = (v) => String(Math.round(v * 100) / 100),
    friendlyAxis,
    chartHeight = DEFAULT_H,
    fitToWidth = false,
    labelEvery = 1,
    xSlot,
    zoomable = false,
}: LineTrendProps) {
    const { width: winW } = useWindowDimensions();
    const n = values.length;
    const slot = xSlot ?? X_SLOT;
    const minInnerW = Math.max(1, (n - 1) * slot);
    const fitW = Math.max(240, winW - 48);
    const innerW = fitToWidth ? Math.max(1, fitW - PAD_BASE.l - PAD_BASE.r) : minInnerW;
    const W = PAD_BASE.l + innerW + PAD_BASE.r;
    const innerH = chartHeight - PAD_BASE.t - PAD_BASE.b;
    const step = n > 1 ? innerW / (n - 1) : 0;
    const labelSlot = fitToWidth ? Math.max(18, step) : slot;

    const xAt = (i: number) => PAD_BASE.l + i * step;

    const xy = (i: number, v: number) => {
        const x = xAt(i);
        const t = (v - yMin) / (yMax - yMin || 1);
        const y = PAD_BASE.t + innerH * (1 - t);
        return { x, y };
    };

    const yBaseline = PAD_BASE.t + innerH;
    const gridYs = [0.25, 0.5, 0.75].map((frac) => PAD_BASE.t + innerH * frac);
    const gradientId = `trend-grad-${title.replace(/\s+/g, '-').toLowerCase()}`;
    const contiguousSegments: { i: number; v: number }[][] = [];
    let current: { i: number; v: number }[] = [];
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v == null || Number.isNaN(v)) {
            if (current.length > 0) contiguousSegments.push(current);
            current = [];
            continue;
        }
        current.push({ i, v });
    }
    if (current.length > 0) contiguousSegments.push(current);

    const buildLinePath = (seg: { i: number; v: number }[]) => {
        if (seg.length === 0) return '';
        return seg
            .map((p, idx) => {
                const { x, y } = xy(p.i, p.v);
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
    };

    const buildAreaPath = (seg: { i: number; v: number }[]) => {
        if (seg.length === 0) return '';
        const first = seg[0];
        const last = seg[seg.length - 1];
        const linePath = buildLinePath(seg);
        return `${linePath} L ${xAt(last.i)} ${yBaseline} L ${xAt(first.i)} ${yBaseline} Z`;
    };

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={{ color: AURORA.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                {title}
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{caption}</Text>
            {fitToWidth ? (
                <View>
                    <Svg width={W} height={chartHeight}>
                        <Defs>
                            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                <Stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                                <Stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                            </LinearGradient>
                        </Defs>
                        {gridYs.map((gy, gi) => (
                            <Line
                                key={`g-${gi}`}
                                x1={PAD_BASE.l}
                                y1={gy}
                                x2={PAD_BASE.l + innerW}
                                y2={gy}
                                stroke={AURORA.borderLight}
                                strokeWidth={1}
                                strokeDasharray="5,6"
                                opacity={0.45}
                            />
                        ))}
                        <Line
                            x1={PAD_BASE.l}
                            y1={yBaseline}
                            x2={PAD_BASE.l + innerW}
                            y2={yBaseline}
                            stroke={AURORA.borderLight}
                            strokeWidth={1.2}
                        />
                        <Line
                            x1={PAD_BASE.l}
                            y1={PAD_BASE.t}
                            x2={PAD_BASE.l}
                            y2={yBaseline}
                            stroke={AURORA.borderLight}
                            strokeWidth={1.2}
                        />
                        {/* Ghost: faint baseline markers for days with no log (honest gaps — no interpolation). */}
                        {values.map((v, i) => {
                            if (v != null) return null;
                            const x = xAt(i);
                            return (
                                <Circle
                                    key={`gh-${i}`}
                                    cx={x}
                                    cy={yBaseline}
                                    r={3.5}
                                    fill="rgba(255,255,255,0.14)"
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth={1}
                                />
                            );
                        })}
                        {/* Dashed baseline trail across no-log runs */}
                        {values.map((v, i) => {
                            if (i >= n - 1) return null;
                            const v2 = values[i + 1];
                            if (v != null || v2 != null) return null;
                            return (
                                <Line
                                    key={`gb-${i}`}
                                    x1={xAt(i)}
                                    y1={yBaseline}
                                    x2={xAt(i + 1)}
                                    y2={yBaseline}
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth={1}
                                    strokeDasharray="4,5"
                                />
                            );
                        })}
                        {contiguousSegments.map((seg, si) => {
                            const area = buildAreaPath(seg);
                            if (!area) return null;
                            return (
                                <Path
                                    key={`area-${si}`}
                                    d={area}
                                    fill={`url(#${gradientId})`}
                                />
                            );
                        })}
                        {contiguousSegments.map((seg, si) => {
                            const d = buildLinePath(seg);
                            if (!d) return null;
                            return (
                                <Fragment key={`line-${si}`}>
                                    {/* Glow layer */}
                                    <Path
                                        d={d}
                                        stroke={stroke}
                                        strokeOpacity={0.22}
                                        strokeWidth={9}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                    {/* Main line */}
                                    <Path
                                        d={d}
                                        stroke={stroke}
                                        strokeWidth={3.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                </Fragment>
                            );
                        })}
                        {values.map((v, i) => {
                            if (v == null || Number.isNaN(v)) return null;
                            const { x, y } = xy(i, v);
                            return (
                                <Fragment key={`pt-${i}`}>
                                    <Circle
                                        cx={x}
                                        cy={y}
                                        r={7}
                                        fill={stroke}
                                        opacity={0.18}
                                    />
                                    <Circle
                                        cx={x}
                                        cy={y}
                                        r={4.4}
                                        fill={stroke}
                                        stroke="#FFFFFF"
                                        strokeWidth={1.4}
                                    />
                                </Fragment>
                            );
                        })}
                        {friendlyAxis ? (
                            <>
                                <SvgText
                                    x={6}
                                    y={PAD_BASE.t + 10}
                                    fill={AURORA.textSec}
                                    fontSize="10"
                                    fontWeight="600"
                                >
                                    {friendlyAxis.high}
                                </SvgText>
                                <SvgText
                                    x={6}
                                    y={PAD_BASE.t + innerH / 2 + 4}
                                    fill={AURORA.textMuted}
                                    fontSize="9"
                                >
                                    {friendlyAxis.mid}
                                </SvgText>
                                <SvgText
                                    x={6}
                                    y={PAD_BASE.t + innerH - 2}
                                    fill={AURORA.textSec}
                                    fontSize="10"
                                    fontWeight="600"
                                >
                                    {friendlyAxis.low}
                                </SvgText>
                            </>
                        ) : (
                            <>
                                <SvgText x={6} y={PAD_BASE.t + 10} fill={AURORA.textMuted} fontSize="10">
                                    {formatY(yMax)}
                                </SvgText>
                                <SvgText x={6} y={PAD_BASE.t + innerH - 2} fill={AURORA.textMuted} fontSize="10">
                                    {formatY(yMin)}
                                </SvgText>
                            </>
                        )}
                    </Svg>
                    <View style={{ width: W, height: 44, marginTop: 4, position: 'relative' }}>
                        {labels.map((lb, i) => (
                            i % Math.max(1, labelEvery) === 0 ? (
                            <View
                                key={`${lb}-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: xAt(i) - labelSlot / 2,
                                    width: labelSlot,
                                    top: 0,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: AURORA.textSec,
                                        fontSize: 10,
                                        fontWeight: '500',
                                        textAlign: 'center',
                                    }}
                                >
                                    {lb}
                                </Text>
                            </View>
                            ) : null
                        ))}
                    </View>
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    minimumZoomScale={zoomable ? 1 : undefined}
                    maximumZoomScale={zoomable ? 3 : undefined}
                    bouncesZoom={zoomable}
                    pinchGestureEnabled={zoomable}
                >
                    <View>
                        <Svg width={W} height={chartHeight}>
                            <Defs>
                                <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <Stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                                    <Stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                                </LinearGradient>
                            </Defs>
                            {gridYs.map((gy, gi) => (
                                <Line
                                    key={`g-${gi}`}
                                    x1={PAD_BASE.l}
                                    y1={gy}
                                    x2={PAD_BASE.l + innerW}
                                    y2={gy}
                                    stroke={AURORA.borderLight}
                                    strokeWidth={1}
                                    strokeDasharray="5,6"
                                    opacity={0.45}
                                />
                            ))}
                            <Line x1={PAD_BASE.l} y1={yBaseline} x2={PAD_BASE.l + innerW} y2={yBaseline} stroke={AURORA.borderLight} strokeWidth={1.2} />
                            <Line x1={PAD_BASE.l} y1={PAD_BASE.t} x2={PAD_BASE.l} y2={yBaseline} stroke={AURORA.borderLight} strokeWidth={1.2} />
                            {values.map((v, i) => {
                                if (v != null) return null;
                                const x = xAt(i);
                                return <Circle key={`gh-${i}`} cx={x} cy={yBaseline} r={3.5} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />;
                            })}
                            {values.map((v, i) => {
                                if (i >= n - 1) return null;
                                const v2 = values[i + 1];
                                if (v != null || v2 != null) return null;
                                return <Line key={`gb-${i}`} x1={xAt(i)} y1={yBaseline} x2={xAt(i + 1)} y2={yBaseline} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4,5" />;
                            })}
                            {contiguousSegments.map((seg, si) => {
                                const area = buildAreaPath(seg);
                                if (!area) return null;
                                return <Path key={`area-${si}`} d={area} fill={`url(#${gradientId})`} />;
                            })}
                            {contiguousSegments.map((seg, si) => {
                                const d = buildLinePath(seg);
                                if (!d) return null;
                                return (
                                    <Fragment key={`line-${si}`}>
                                        <Path d={d} stroke={stroke} strokeOpacity={0.22} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                        <Path d={d} stroke={stroke} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </Fragment>
                                );
                            })}
                            {values.map((v, i) => {
                                if (v == null || Number.isNaN(v)) return null;
                                const { x, y } = xy(i, v);
                                return (
                                    <Fragment key={`pt-${i}`}>
                                        <Circle cx={x} cy={y} r={7} fill={stroke} opacity={0.18} />
                                        <Circle cx={x} cy={y} r={4.4} fill={stroke} stroke="#FFFFFF" strokeWidth={1.4} />
                                    </Fragment>
                                );
                            })}
                            {friendlyAxis ? (
                                <>
                                    <SvgText x={6} y={PAD_BASE.t + 10} fill={AURORA.textSec} fontSize="10" fontWeight="600">{friendlyAxis.high}</SvgText>
                                    <SvgText x={6} y={PAD_BASE.t + innerH / 2 + 4} fill={AURORA.textMuted} fontSize="9">{friendlyAxis.mid}</SvgText>
                                    <SvgText x={6} y={PAD_BASE.t + innerH - 2} fill={AURORA.textSec} fontSize="10" fontWeight="600">{friendlyAxis.low}</SvgText>
                                </>
                            ) : (
                                <>
                                    <SvgText x={6} y={PAD_BASE.t + 10} fill={AURORA.textMuted} fontSize="10">{formatY(yMax)}</SvgText>
                                    <SvgText x={6} y={PAD_BASE.t + innerH - 2} fill={AURORA.textMuted} fontSize="10">{formatY(yMin)}</SvgText>
                                </>
                            )}
                        </Svg>
                        <View style={{ width: W, height: 44, marginTop: 4, position: 'relative' }}>
                            {labels.map((lb, i) => (
                                <View
                                    key={`${lb}-${i}`}
                                    style={{
                                        position: 'absolute',
                                        left: xAt(i) - labelSlot / 2,
                                        width: labelSlot,
                                        top: 0,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: AURORA.textSec, fontSize: 10, fontWeight: '500', textAlign: 'center' }}>
                                        {lb}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            )}
            <Text style={{ color: AURORA.textMuted, fontSize: 11, marginTop: 8 }}>{TREND_LEGEND}</Text>
            <Text style={{ color: AURORA.textMuted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                {TREND_GAP_NOTE}
            </Text>
        </View>
    );
}

interface BarTaskProps {
    title: string;
    caption: string;
    tasks: number[];
    labels: string[];
    chartHeight?: number;
}

export function TaskLoadBarChart({ title, caption, tasks, labels, chartHeight = DEFAULT_H }: BarTaskProps) {
    const n = tasks.length;
    const innerW = Math.max(1, (n - 1) * X_SLOT);
    const W = PAD_BASE.l + innerW + PAD_BASE.r;
    const innerH = chartHeight - PAD_BASE.t - PAD_BASE.b;
    const maxT = Math.max(1, ...tasks);
    const barW = Math.min(28, X_SLOT - 8);
    const xAt = (i: number) => PAD_BASE.l + i * X_SLOT;

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={{ color: AURORA.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                {title}
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{caption}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    <Svg width={W} height={chartHeight}>
                        <Line
                            x1={PAD_BASE.l}
                            y1={PAD_BASE.t + innerH}
                            x2={PAD_BASE.l + innerW}
                            y2={PAD_BASE.t + innerH}
                            stroke={AURORA.borderLight}
                            strokeWidth={1.2}
                        />
                        {tasks.map((t, i) => {
                            const h = t === 0 ? 0 : Math.max(6, (t / maxT) * innerH);
                            const cx = xAt(i);
                            const bx = cx - barW / 2;
                            const y = PAD_BASE.t + innerH - h;
                            return (
                                <Fragment key={i}>
                                    <Rect
                                        x={bx}
                                        y={y}
                                        width={barW}
                                        height={h}
                                        fill={AURORA.blue}
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
                    <View style={{ width: W, height: 44, marginTop: 4, position: 'relative' }}>
                        {labels.map((lb, i) => (
                            <View
                                key={`${lb}-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: xAt(i) - X_SLOT / 2,
                                    width: X_SLOT,
                                    top: 0,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: AURORA.textSec,
                                        fontSize: 10,
                                        fontWeight: '500',
                                        textAlign: 'center',
                                    }}
                                >
                                    {lb}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

interface DonutProps {
    title: string;
    caption: string;
    segments: { label: string; value: number; color: string; hint?: string }[];
    centerValue: string;
    centerLabel: string;
}

function DonutSvgAnimatedWrap({
    reduceMotion,
    children,
}: {
    reduceMotion: boolean;
    children: React.ReactNode;
}) {
    const opacity = useSharedValue(reduceMotion ? 1 : 0);
    const scale = useSharedValue(reduceMotion ? 1 : 0.94);
    useEffect(() => {
        if (reduceMotion) return;
        opacity.value = withTiming(1, { duration: 720 });
        scale.value = withTiming(1, { duration: 720 });
    }, [reduceMotion, opacity, scale]);
    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));
    return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function MoodDistributionDonut({
    title,
    caption,
    segments,
    centerValue,
    centerLabel,
}: DonutProps) {
    const reduceMotion = useReducedMotion();
    const { width: winW } = useWindowDimensions();
    const W = Math.min(winW - 24, 400);
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = 62;
    const cx = W / 2;
    const cy = 88;
    let angle = -Math.PI / 2;
    const arcs: ReactElement[] = [];

    if (total === 0) {
        return (
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: AURORA.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                    {title}
                </Text>
                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>{caption}</Text>
                <View
                    style={{
                        backgroundColor: AURORA.cardAlt,
                        padding: 20,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                    }}
                >
                    <Text style={{ color: AURORA.textSec, fontSize: 14, textAlign: 'center' }}>
                        No check-ins in this two-week window yet. After you log, you will see how your days split out.
                    </Text>
                </View>
            </View>
        );
    }

    segments.forEach((seg, idx) => {
        const frac = seg.value / total;
        const a2 = angle + frac * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        const large = a2 - angle > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        if (seg.value > 0) arcs.push(<Path key={idx} d={d} fill={seg.color} />);
        angle = a2;
    });

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: AURORA.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                {title}
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{caption}</Text>
            <DonutSvgAnimatedWrap reduceMotion={reduceMotion}>
                <Svg width={W} height={190}>
                    {arcs}
                    <Circle cx={cx} cy={cy} r={r * 0.58} fill={AURORA.card} stroke={AURORA.borderLight} strokeWidth={1} />
                    <SvgText
                        x={cx}
                        y={cy - 6}
                        fill={AURORA.textPrimary}
                        fontSize="22"
                        fontWeight="800"
                        textAnchor="middle"
                    >
                        {centerValue}
                    </SvgText>
                    <SvgText
                        x={cx}
                        y={cy + 14}
                        fill={AURORA.textMuted}
                        fontSize="11"
                        textAnchor="middle"
                    >
                        {centerLabel}
                    </SvgText>
                </Svg>
            </DonutSvgAnimatedWrap>
            <View style={{ gap: 10, marginTop: 4 }}>
                {segments.map((s) => (
                    <View key={s.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: 4,
                                backgroundColor: s.color,
                                marginTop: 3,
                            }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '600' }}>
                                {s.label}{' '}
                                <Text style={{ color: AURORA.textSec, fontWeight: '500' }}>
                                    ({total ? Math.round((s.value / total) * 100) : 0}% of check-ins)
                                </Text>
                            </Text>
                            {s.hint ? (
                                <Text style={{ color: AURORA.textMuted, fontSize: 12, marginTop: 2 }}>{s.hint}</Text>
                            ) : null}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const STRIP_LEGEND: { mood: number | null; label: string }[] = [
    { mood: null, label: 'No check-in' },
    { mood: 1, label: 'Low mood (1–2)' },
    { mood: 3, label: 'Okay mood (3)' },
    { mood: 5, label: 'Good mood (4–5)' },
];

/**
 * Horizontal scroll of one tile per day: color = energy scale when logged, muted when not.
 * Last tile is today (blue ring).
 */
export function MoodWeekStrip({ points }: { points: DailyChartPoint[] }) {
    const n = points.length;
    const todayIndex = n > 0 ? n - 1 : -1;
    const reduceMotion = useReducedMotion();

    return (
        <View>
            <Text style={{ color: AURORA.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                3-week glance
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                One square per day (left = older, right = today). Color matches your mood scale (1–5). Swipe sideways
                on small screens.
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                    paddingVertical: 6,
                    paddingRight: 8,
                }}
            >
                {points.map((p, i) => {
                    const isToday = i === todayIndex;
                    const Cell = (
                        <View style={{ alignItems: 'center', width: 40 }}>
                            <View
                                style={{
                                    width: 30,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: moodStripFillForScale(p.moodScale),
                                    borderWidth: isToday ? 2 : p.moodScale == null ? 1 : 0,
                                    borderColor: isToday ? AURORA.blue : AURORA.borderLight,
                                }}
                            />
                            <Text
                                style={{
                                    color: isToday ? AURORA.blue : AURORA.textMuted,
                                    fontSize: 10,
                                    fontWeight: isToday ? '700' : '500',
                                    marginTop: 6,
                                }}
                            >
                                {p.labelShort}
                            </Text>
                            {isToday ? (
                                <Text style={{ color: AURORA.blue, fontSize: 9, fontWeight: '700', marginTop: 2 }}>
                                    Today
                                </Text>
                            ) : (
                                <View style={{ height: 13 }} />
                            )}
                        </View>
                    );
                    if (reduceMotion) {
                        return (
                            <View key={p.dateKey}>
                                {Cell}
                            </View>
                        );
                    }
                    return (
                        <Animatable.View
                            key={p.dateKey}
                            animation="fadeInUp"
                            delay={i * 38}
                            duration={320}
                            useNativeDriver
                        >
                            {Cell}
                        </Animatable.View>
                    );
                })}
            </ScrollView>
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: AURORA.border,
                }}
            >
                {STRIP_LEGEND.map((item) => (
                    <View key={String(item.mood)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                            style={{
                                width: 14,
                                height: 14,
                                borderRadius: 4,
                                backgroundColor: moodStripFillForScale(item.mood),
                                borderWidth: item.mood == null ? 1 : 0,
                                borderColor: AURORA.borderLight,
                            }}
                        />
                        <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
