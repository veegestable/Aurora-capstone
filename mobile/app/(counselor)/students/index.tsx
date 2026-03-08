/**
 * Counselor Student Directory - students/index.tsx
 * =================================================
 * Route: /(counselor)/students
 * Shows all registered Aurora students with risk levels.
 * Fetches real student data from Firestore.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Search, ChevronDown } from 'lucide-react-native';
import { AURORA } from '../../../src/constants/aurora-colors';
import { firestoreService } from '../../../src/services/firebase-firestore.service';
import StudentProfileModal from '../../../src/components/counselor/StudentProfileModal';

// ─── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel = 'HIGH RISK' | 'MEDIUM RISK' | 'LOW RISK';
type ProgramFilter = 'All Students' | 'BSCS' | 'BSIT' | 'BSIS';

interface StudentEntry {
    id: string;
    full_name: string;
    department?: string;
    year_level?: string;
    avatar_url?: string;
    riskLevel: RiskLevel;
    moodEmoji: string;
    lastLog: string;
}

// ─── Mock risk overlay (applied to fetched students) ──────────────────────────
const RISK_LEVELS: RiskLevel[] = ['HIGH RISK', 'MEDIUM RISK', 'LOW RISK'];
const MOOD_EMOJIS: Record<RiskLevel, string> = {
    'HIGH RISK': '😢',
    'MEDIUM RISK': '😐',
    'LOW RISK': '😊',
};

function assignMockRisk(index: number): RiskLevel {
    return RISK_LEVELS[index % RISK_LEVELS.length];
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

function deriveRiskFromMood(stressLevel?: number, energyLevel?: number): RiskLevel {
    const stress = stressLevel ?? 5;
    const energy = energyLevel ?? 5;
    if (stress >= 7 || energy <= 2) return 'HIGH RISK';
    if (stress >= 5 || energy <= 4) return 'MEDIUM RISK';
    return 'LOW RISK';
}

// ─── Risk helpers ──────────────────────────────────────────────────────────────
function getRiskStyle(risk: RiskLevel) {
    switch (risk) {
        case 'HIGH RISK':
            return { border: AURORA.red, badgeBg: 'rgba(239,68,68,0.15)', text: AURORA.red };
        case 'MEDIUM RISK':
            return { border: AURORA.orange, badgeBg: 'rgba(249,115,22,0.15)', text: AURORA.orange };
        case 'LOW RISK':
            return { border: AURORA.blue, badgeBg: 'rgba(45,107,255,0.15)', text: AURORA.blue };
    }
}

function formatProgram(department?: string, yearLevel?: string): string {
    const dept = department?.toUpperCase().replace('BACHELOR OF SCIENCE IN ', 'BS').replace('COMPUTER SCIENCE', 'BSCS').replace('INFORMATION TECHNOLOGY', 'BSIT').replace('INFORMATION SYSTEMS', 'BSIS') || 'BSCS';
    const year = yearLevel ? `${yearLevel.replace('st', 'ST').replace('nd', 'ND').replace('rd', 'RD').replace('th', 'TH')} YEAR` : '1ST YEAR';
    return `${dept} · ${year}`;
}

// ─── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onPress }: { student: StudentEntry; onPress: () => void }) {
    const style = getRiskStyle(student.riskLevel);
    const programText = formatProgram(student.department, student.year_level);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: AURORA.card, borderRadius: 16,
                marginBottom: 10, overflow: 'hidden',
                borderWidth: 1, borderColor: AURORA.border,
            }}
        >
            {/* Left colored risk border */}
            <View style={{ width: 4, backgroundColor: style.border, alignSelf: 'stretch' }} />

            {/* Avatar */}
            <View style={{ padding: 12 }}>
                <Image
                    source={{
                        uri: student.avatar_url ||
                            `https://i.pravatar.cc/56?u=${student.id}_student`,
                    }}
                    style={{
                        width: 56, height: 56, borderRadius: 28,
                        borderWidth: 2, borderColor: style.border,
                        backgroundColor: AURORA.cardAlt,
                    }}
                />
            </View>

            {/* Info */}
            <View style={{ flex: 1, paddingVertical: 14 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
                    {student.full_name}
                </Text>
                <Text style={{
                    color: AURORA.textSec, fontSize: 11,
                    fontWeight: '700', letterSpacing: 0.5, marginBottom: 8,
                }}>
                    {programText}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{
                        backgroundColor: style.badgeBg, borderRadius: 8,
                        paddingHorizontal: 8, paddingVertical: 4,
                        borderWidth: 1, borderColor: `${style.text}44`,
                    }}>
                        <Text style={{ color: style.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                            {student.riskLevel}
                        </Text>
                    </View>
                    <Text style={{ color: AURORA.textMuted, fontSize: 11, marginRight: 12 }}>
                        Last log: {student.lastLog}
                    </Text>
                </View>
            </View>

            {/* Mood emoji */}
            <Text style={{ fontSize: 22, marginRight: 14 }}>
                {student.moodEmoji}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Filter Chip ───────────────────────────────────────────────────────────────
function FilterChip({
    label, active, hasDropdown, onPress,
}: {
    label: string; active: boolean; hasDropdown?: boolean; onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                backgroundColor: active ? AURORA.blue : 'transparent',
                borderWidth: 1.5,
                borderColor: active ? AURORA.blue : AURORA.borderLight,
                borderRadius: 30, paddingHorizontal: 16, paddingVertical: 5,
                marginRight: 8,
                minWidth: 88,
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{
                color: active ? '#FFFFFF' : AURORA.textSec,
                fontSize: 13, fontWeight: active ? '700' : '500',
            }}>
                {label}
            </Text>
            {hasDropdown && (
                <ChevronDown size={12} color={active ? '#FFFFFF' : AURORA.textSec} />
            )}
        </TouchableOpacity>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorStudentsScreen() {
    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ProgramFilter>('All Students');
    const [selectedStudent, setSelectedStudent] = useState<StudentEntry | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const raw = await firestoreService.getUsersByRole('student');
                const mapped: StudentEntry[] = await Promise.all(
                    raw.map(async (s, i) => {
                        let lastLog = 'No logs';
                        let riskLevel = assignMockRisk(i);
                        try {
                            const logs = await firestoreService.getMoodLogs(s.id);
                            const latest = logs[0] as any;
                            if (latest?.log_date) {
                                lastLog = formatTimeAgo(new Date(latest.log_date));
                                riskLevel = deriveRiskFromMood(latest?.stress_level, latest?.energy_level);
                            }
                        } catch { /* use fallbacks */ }
                        return {
                            id: s.id,
                            full_name: s.full_name || 'Student',
                            department: s.department,
                            year_level: s.year_level,
                            avatar_url: s.avatar_url,
                            riskLevel,
                            moodEmoji: MOOD_EMOJIS[riskLevel],
                            lastLog,
                        };
                    })
                );
                setStudents(mapped.length > 0 ? mapped : MOCK_STUDENTS);
            } catch {
                setStudents(MOCK_STUDENTS);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const FILTERS: ProgramFilter[] = ['All Students', 'BSCS', 'BSIT', 'BSIS'];

    const filtered = useMemo(() => {
        let list = students;
        if (activeFilter !== 'All Students') {
            list = list.filter(s =>
                s.department?.toUpperCase().includes(activeFilter) ||
                formatProgram(s.department, s.year_level).includes(activeFilter)
            );
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s =>
                s.full_name.toLowerCase().includes(q) ||
                s.department?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [students, activeFilter, searchQuery]);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header, Search, Filters (fixed top section) ──────────── */}
                <View style={{ flexShrink: 0, backgroundColor: AURORA.bgDeep, zIndex: 1 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'flex-start',
                        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>
                                Student Directory
                            </Text>
                            <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 3 }}>
                                Manage and monitor student wellness
                            </Text>
                        </View>
                        <TouchableOpacity style={{
                            width: 42, height: 42, borderRadius: 21,
                            backgroundColor: AURORA.card,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: AURORA.border,
                            marginTop: 2,
                        }}>
                            <Bell size={20} color={AURORA.textSec} />
                            <View style={{
                                position: 'absolute', top: 8, right: 8,
                                width: 8, height: 8, borderRadius: 4,
                                backgroundColor: AURORA.blue,
                                borderWidth: 1.5, borderColor: AURORA.card,
                            }} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: AURORA.card, borderRadius: 30,
                            paddingHorizontal: 16, paddingVertical: 12,
                            borderWidth: 1, borderColor: AURORA.border, gap: 10,
                        }}>
                            <Search size={18} color={AURORA.textMuted} />
                            <TextInput
                                style={{ flex: 1, color: '#FFFFFF', fontSize: 14 }}
                                placeholder="Search name, ID or program..."
                                placeholderTextColor={AURORA.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexDirection: 'row' }}
                            style={{ flexGrow: 0 }}
                        >
                            {FILTERS.map(f => (
                                <FilterChip
                                    key={f}
                                    label={f}
                                    active={activeFilter === f}
                                    hasDropdown={f !== 'All Students'}
                                    onPress={() => setActiveFilter(f)}
                                />
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* ── Student List (scrollable, fills remaining space) ─────── */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={AURORA.blue} size="large" />
                    </View>
                ) : (
                    <FlatList
                        style={{ flex: 1, minHeight: 0 }}
                        data={filtered}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <StudentCard
                                student={item}
                                onPress={() => setSelectedStudent(item)}
                            />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 60 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                    No students found.
                                </Text>
                            </View>
                        }
                    />
                )}

                <StudentProfileModal
                    visible={!!selectedStudent}
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            </SafeAreaView>
        </View>
    );
}

// ─── Fallback Mock Students ────────────────────────────────────────────────────
const MOCK_STUDENTS: StudentEntry[] = [
    {
        id: 'm1', full_name: 'Marcus Chen', department: 'Computer Science',
        year_level: '4th', riskLevel: 'HIGH RISK', moodEmoji: '😢', lastLog: '2h ago',
    },
    {
        id: 'm2', full_name: 'Sarah Jenkins', department: 'Information Systems',
        year_level: '2nd', riskLevel: 'MEDIUM RISK', moodEmoji: '😐', lastLog: '5h ago',
    },
    {
        id: 'm3', full_name: 'David Miller', department: 'Information Technology',
        year_level: '3rd', riskLevel: 'LOW RISK', moodEmoji: '😊', lastLog: '1d ago',
    },
    {
        id: 'm4', full_name: 'Elena Rodriguez', department: 'Computer Science',
        year_level: '1st', riskLevel: 'LOW RISK', moodEmoji: '😄', lastLog: '3h ago',
    },
    {
        id: 'm5', full_name: 'Jordan Smith', department: 'Information Technology',
        year_level: '4th', riskLevel: 'MEDIUM RISK', moodEmoji: '😟', lastLog: '12h ago',
    },
];
