/**
 * StudentProfileModal - Bottom sheet modal showing student mood graph
 */

import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { X } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { firestoreService } from '../../services/firebase-firestore.service';

const CHART_WIDTH = Dimensions.get('window').width - 48;
const CHART_HEIGHT = 160;

interface MoodLog {
    stress_level?: number;
    energy_level?: number;
    log_date: Date;
}

interface StudentEntry {
    id: string;
    full_name: string;
    department?: string;
    year_level?: string;
    avatar_url?: string;
}

interface StudentProfileModalProps {
    visible: boolean;
    student: StudentEntry | null;
    onClose: () => void;
}

function formatProgram(department?: string, yearLevel?: string): string {
    const dept = department?.toUpperCase()
        ?.replace('BACHELOR OF SCIENCE IN ', 'BS')
        .replace('COMPUTER SCIENCE', 'BSCS')
        .replace('INFORMATION TECHNOLOGY', 'BSIT')
        .replace('INFORMATION SYSTEMS', 'BSIS') || 'BSCS';
    const year = yearLevel ? `${yearLevel} Year` : '1st Year';
    return `${dept} · ${year}`;
}

export default function StudentProfileModal({
    visible,
    student,
    onClose,
}: StudentProfileModalProps) {
    const [logs, setLogs] = useState<MoodLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !student) return;

        setLoading(true);
        firestoreService
            .getMoodLogs(student.id)
            .then((data) => {
                const moodLogs: MoodLog[] = (data || []).map((l: any) => ({
                    stress_level: l.stress_level ?? 5,
                    energy_level: l.energy_level ?? 5,
                    log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date),
                }));
                setLogs(moodLogs.slice(0, 14).reverse());
            })
            .catch(() => setLogs([]))
            .finally(() => setLoading(false));
    }, [visible, student?.id]);

    if (!student) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    {/* Handle bar */}
                    <View style={styles.handleBar} />

                    {/* Header with X */}
                    <View style={styles.header}>
                        <View style={styles.studentInfo}>
                            <Image
                                source={{
                                    uri: student.avatar_url || `https://i.pravatar.cc/56?u=${student.id}`,
                                }}
                                style={styles.avatar}
                            />
                            <View>
                                <Text style={styles.name}>{student.full_name}</Text>
                                <Text style={styles.program}>{formatProgram(student.department, student.year_level)}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    {/* Mood Graph Section */}
                    <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>Mood Trend (Stress & Energy)</Text>
                        {loading ? (
                            <View style={[styles.chartBox, styles.chartPlaceholder]}>
                                <ActivityIndicator color={AURORA.blue} size="large" />
                            </View>
                        ) : logs.length === 0 ? (
                            <View style={[styles.chartBox, styles.chartPlaceholder]}>
                                <Text style={styles.emptyText}>No mood logs yet</Text>
                            </View>
                        ) : (
                            <MoodChart logs={logs} />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function MoodChart({ logs }: { logs: MoodLog[] }) {
    const padding = { top: 20, right: 8, bottom: 30, left: 36 };
    const innerWidth = CHART_WIDTH - padding.left - padding.right;
    const innerHeight = CHART_HEIGHT - padding.top - padding.bottom;

    const stressValues = logs.map((l) => l.stress_level ?? 5);
    const energyValues = logs.map((l) => l.energy_level ?? 5);
    const allValues = [...stressValues, ...energyValues];
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(10, ...allValues);
    const range = maxVal - minVal || 1;

    const getY = (val: number) => {
        const normalized = (val - minVal) / range;
        return padding.top + innerHeight * (1 - normalized);
    };
    const getX = (i: number) => padding.left + (innerWidth / Math.max(1, logs.length - 1)) * i;

    const stressPoints = stressValues.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
    const energyPoints = energyValues.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

    return (
        <View style={styles.chartBox}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {/* Y-axis labels */}
                <SvgText x={8} y={padding.top + 4} fill={AURORA.textMuted} fontSize={10}>
                    10
                </SvgText>
                <SvgText x={12} y={padding.top + innerHeight / 2 + 4} fill={AURORA.textMuted} fontSize={10}>
                    5
                </SvgText>
                <SvgText x={14} y={padding.top + innerHeight + 4} fill={AURORA.textMuted} fontSize={10}>
                    0
                </SvgText>

                {/* Grid line */}
                <Line
                    x1={padding.left}
                    y1={padding.top + innerHeight / 2}
                    x2={CHART_WIDTH - padding.right}
                    y2={padding.top + innerHeight / 2}
                    stroke={AURORA.border}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                />

                {/* Stress line */}
                <Polyline
                    points={stressPoints}
                    fill="none"
                    stroke={AURORA.red}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Energy line */}
                <Polyline
                    points={energyPoints}
                    fill="none"
                    stroke={AURORA.green}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: AURORA.red }]} />
                    <Text style={styles.legendText}>Stress</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: AURORA.green }]} />
                    <Text style={styles.legendText}>Energy</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: AURORA.cardAlt,
    },
    name: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    program: {
        color: AURORA.textSec,
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    chartSection: {
        marginBottom: 8,
    },
    chartTitle: {
        color: AURORA.textSec,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    chartBox: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
        padding: 12,
    },
    chartPlaceholder: {
        height: CHART_HEIGHT + 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: AURORA.textMuted,
        fontSize: 14,
    },
    legend: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: AURORA.border,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: AURORA.textSec,
        fontSize: 12,
    },
});
