/**
 * Counselor Student Directory - students/index.tsx
 * =================================================
 * Route: /(counselor)/students
 * Shows all registered Aurora students with session-consent roster chips.
 * Fetches real student data from Firestore.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Search, ChevronDown } from 'lucide-react-native';
import { AURORA } from '../../../src/constants/aurora-colors';
import { LetterAvatar } from '../../../src/components/common/LetterAvatar';
import { firestoreService } from '../../../src/services/firebase-firestore.service';
import {
    formatCounselorStudentSubtitle,
    normalizeStudentToProgramFilter,
    PROGRAM_FILTER_LABELS,
    type ProgramFilterCode,
} from '../../../src/constants/ccs-student-programs';
import { fetchStudentCheckInSignalContextForCounselor } from '../../../src/services/counselor-checkin-context.service';
import { getUserSettings } from '../../../src/services/mood-firestore-v2.service';
import {
    type CounselorStudentRosterPill,
    COUNSELOR_ROSTER_PILL_LABEL,
    COUNSELOR_ROSTER_PILL_SORT,
} from '../../../src/constants/counselor-student-roster-pills';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/stores/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ProgramFilter = 'All Students' | ProgramFilterCode;

interface StudentEntry {
    id: string;
    full_name: string;
    department?: string;
    program?: string;
    year_level?: string;
    avatar_url?: string;
    rosterPill: CounselorStudentRosterPill;
    /** Activity line (neutral wording; avoids whole-roster mood triage). */
    activitySummary: string;
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

function getRosterPillStyle(pill: CounselorStudentRosterPill) {
    switch (pill) {
        case 'session_started':
            return { border: AURORA.blue, badgeBg: 'rgba(45,107,255,0.15)', text: AURORA.blue };
        case 'no_session_yet':
            return {
                border: 'rgba(148,163,184,0.55)',
                badgeBg: 'rgba(148,163,184,0.12)',
                text: AURORA.textSec,
            };
    }
}

function rosterPillChipLabel(pill: CounselorStudentRosterPill): string {
    return COUNSELOR_ROSTER_PILL_LABEL[pill];
}

// ─── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onPress }: { student: StudentEntry; onPress: () => void }) {
    const style = getRosterPillStyle(student.rosterPill);
    const programText = formatCounselorStudentSubtitle({
        department: student.department,
        program: student.program,
        year_level: student.year_level,
    }) || 'CCS';

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
            {/* Left accent by roster pill */}
            <View style={{ width: 4, backgroundColor: style.border, alignSelf: 'stretch' }} />

            {/* Avatar */}
            <View style={{ padding: 12 }}>
                <LetterAvatar name={student.full_name ?? 'Student'} size={56} avatarUrl={student.avatar_url} />
            </View>

            {/* Info — minWidth:0 so long CCS · program · year lines wrap instead of clipping under overflow:hidden */}
            <View style={{ flex: 1, minWidth: 0, paddingVertical: 14, paddingRight: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                    {student.full_name}
                </Text>
                <Text
                    style={{
                        color: '#A8B8DC', fontSize: 11,
                        fontWeight: '700', letterSpacing: 0.5, marginBottom: 8,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {programText}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{
                        flexShrink: 0,
                        backgroundColor: style.badgeBg, borderRadius: 8,
                        paddingHorizontal: 8, paddingVertical: 4,
                        borderWidth: 1, borderColor: `${style.text}44`,
                    }}>
                        <Text style={{ color: style.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.35 }} numberOfLines={2}>
                            {rosterPillChipLabel(student.rosterPill)}
                        </Text>
                    </View>
                    <Text
                        style={{ color: AURORA.textMuted, fontSize: 11, flexShrink: 1, minWidth: 0, textAlign: 'right' }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {student.activitySummary}
                    </Text>
                </View>
            </View>

            {/* Mood emoji */}
            {/* <Text style={{ fontSize: 22, marginRight: 14 }}>
                {student.moodEmoji}
            </Text> */}
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
    const router = useRouter();
    const { user } = useAuth();
    const { openStudentId } = useLocalSearchParams<{ openStudentId?: string }>();
    const lastProcessedOpenId = useRef<string | null>(null);

    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ProgramFilter>('All Students');

    useEffect(() => {
        if (openStudentId == null || openStudentId === '') {
            lastProcessedOpenId.current = null;
            return;
        }
        if (lastProcessedOpenId.current === openStudentId) return;
        lastProcessedOpenId.current = openStudentId;
        router.push(`/(counselor)/students/${openStudentId}`);
        router.setParams({ openStudentId: undefined });
    }, [openStudentId, router]);

    useEffect(() => {
        const fetchStudents = async () => {
            const counselorId = user?.id;
            try {
                const raw = await firestoreService.getUsersByRole('student');
                const mapped: StudentEntry[] = await Promise.all(
                    raw.map(async (s) => {
                        let rosterPill: CounselorStudentRosterPill = 'no_session_yet';
                        let activitySummary = 'No session with you yet';
                        try {
                            let sessionStarted = false;
                            if (counselorId) {
                                const settings = await getUserSettings(s.id);
                                sessionStarted =
                                    settings.counselorJournalAccess?.[counselorId] === true;
                            }
                            if (sessionStarted) {
                                rosterPill = 'session_started';
                                const { logs } =
                                    await fetchStudentCheckInSignalContextForCounselor(
                                        s.id,
                                        counselorId,
                                    );
                                const latest = logs[0] as { log_date?: Date } | undefined;
                                if (latest?.log_date) {
                                    activitySummary = `Last in Aurora: ${formatTimeAgo(new Date(latest.log_date))}`;
                                } else {
                                    activitySummary = 'No Aurora entries in this window yet';
                                }
                            }
                        } catch {
                            rosterPill = 'no_session_yet';
                            activitySummary = '—';
                        }
                        return {
                            id: s.id,
                            full_name: s.full_name || 'Student',
                            department: s.department,
                            program: s.program,
                            year_level: s.year_level,
                            avatar_url: s.avatar_url,
                            rosterPill,
                            activitySummary,
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
        if (!user?.id) {
            setLoading(false);
            return;
        }
        void fetchStudents();
    }, [user?.id]);

    const FILTERS: ProgramFilter[] = ['All Students', 'BSCS', 'BSIT', 'BSIS', 'BSCA'];

    const filtered = useMemo(() => {
        let list = students;
        if (activeFilter !== 'All Students') {
            list = list.filter(
                (s) => normalizeStudentToProgramFilter(s.department, s.program) === activeFilter
            );
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((s) => {
                const subtitle = formatCounselorStudentSubtitle({
                    department: s.department,
                    program: s.program,
                    year_level: s.year_level,
                }).toLowerCase();
                return (
                    s.full_name.toLowerCase().includes(q) ||
                    subtitle.includes(q) ||
                    s.department?.toLowerCase().includes(q) ||
                    s.program?.toLowerCase().includes(q)
                );
            });
        }
        return [...list].sort(
            (a, b) => COUNSELOR_ROSTER_PILL_SORT[a.rosterPill] - COUNSELOR_ROSTER_PILL_SORT[b.rosterPill],
        );
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
                                Open a student for journals & analytics after they request a session with you, or invite them to chat
                            </Text>
                        </View>
                        {/* <TouchableOpacity style={{
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
                        </TouchableOpacity> */}
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
                            {FILTERS.map((f) => (
                                <FilterChip
                                    key={f}
                                    label={f === 'All Students' ? f : PROGRAM_FILTER_LABELS[f as ProgramFilterCode]}
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
                                onPress={() => router.push(`/(counselor)/students/${item.id}`)}
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

            </SafeAreaView>
        </View>
    );
}

// ─── Fallback Mock Students ────────────────────────────────────────────────────
const MOCK_STUDENTS: StudentEntry[] = [
    {
        id: 'm1',
        full_name: 'Marcus Chen',
        department: 'CCS',
        program: 'BS CS (Computer Science)',
        year_level: '4th',
        rosterPill: 'session_started',
        activitySummary: 'Last in Aurora: 2h ago',
    },
    {
        id: 'm2',
        full_name: 'Sarah Jenkins',
        department: 'CCS',
        program: 'BS IS (Information Systems)',
        year_level: '2nd',
        rosterPill: 'no_session_yet',
        activitySummary: 'No session with you yet',
    },
    {
        id: 'm3',
        full_name: 'David Miller',
        department: 'CCS',
        program: 'BS IT (Information Technology)',
        year_level: '3rd',
        rosterPill: 'session_started',
        activitySummary: 'Last in Aurora: 1d ago',
    },
    {
        id: 'm4',
        full_name: 'Elena Rodriguez',
        department: 'CCS',
        program: 'BS CS (Computer Science)',
        year_level: '1st',
        rosterPill: 'session_started',
        activitySummary: 'Last in Aurora: 3h ago',
    },
    {
        id: 'm5',
        full_name: 'Jordan Smith',
        department: 'CCS',
        program: 'BS CA (Computer Application)',
        year_level: '4th',
        rosterPill: 'no_session_yet',
        activitySummary: 'No session with you yet',
    },
];
