/**
 * Counselor Home Dashboard - index.tsx
 * ======================================
 * Route: /(counselor)/
 * Shows stats overview and recent student risk flags.
 * Data fetched from Firestore students + mood logs.
 */

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Bell, ChevronRight, Users, AlertTriangle,
    MessageSquare, Calendar, Plus,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';
import { AURORA } from '../../src/constants/aurora-colors';
import { firestoreService } from '../../src/services/firebase-firestore.service';

// ─── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel = 'HIGH RISK' | 'MEDIUM' | 'RESOLVED';

interface FlagItem {
    id: string;
    name: string;
    program: string;
    time: string;
    risk: RiskLevel;
    avatar: string;
}

// ─── Helpers: derive risk from mood log ─────────────────────────────────────────
function deriveRiskFromMood(stressLevel?: number, energyLevel?: number): RiskLevel {
    const stress = stressLevel ?? 5;
    const energy = energyLevel ?? 5;
    if (stress >= 7 || energy <= 2) return 'HIGH RISK';
    if (stress >= 5 || energy <= 4) return 'MEDIUM';
    return 'RESOLVED';
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

function formatProgram(department?: string, yearLevel?: string): string {
    const dept = department?.toUpperCase()
        ?.replace('BACHELOR OF SCIENCE IN ', 'BS')
        .replace('COMPUTER SCIENCE', 'BSCS')
        .replace('INFORMATION TECHNOLOGY', 'BSIT')
        .replace('INFORMATION SYSTEMS', 'BSIS') || 'BSCS';
    const year = yearLevel
        ? `${yearLevel.replace(/st|nd|rd|th/i, m => m.toUpperCase())} Year`
        : '1st Year';
    return `${dept} · ${year}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getRiskStyle(risk: RiskLevel) {
    switch (risk) {
        case 'HIGH RISK':
            return { border: AURORA.red, badgeBg: 'rgba(239,68,68,0.18)', text: AURORA.red };
        case 'MEDIUM':
            return { border: AURORA.orange, badgeBg: 'rgba(249,115,22,0.18)', text: AURORA.orange };
        case 'RESOLVED':
            return { border: AURORA.green, badgeBg: 'rgba(34,197,94,0.18)', text: AURORA.green };
    }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
interface StatCardProps {
    icon: React.ReactNode;
    count: string | number;
    label: string;
    cardBg?: string;
}

function StatCard({ icon, count, label, cardBg }: StatCardProps) {
    return (
        <View style={{
            flex: 1,
            backgroundColor: cardBg || AURORA.card,
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: AURORA.border,
            minHeight: 155,
        }}>
            {icon}
            <Text style={{
                color: '#FFFFFF', fontSize: 34, fontWeight: '800',
                marginTop: 12, letterSpacing: -0.5,
            }}>
                {count}
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 4 }}>
                {label}
            </Text>
        </View>
    );
}

function FlagRow({ item }: { item: FlagItem }) {
    const style = getRiskStyle(item.risk);
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(counselor)/risk-center', params: { studentId: item.id } })}
            style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: AURORA.card, borderRadius: 16,
                marginBottom: 10, overflow: 'hidden',
                borderWidth: 1, borderColor: AURORA.border,
            }}
        >
            <View style={{ width: 4, backgroundColor: style.border, alignSelf: 'stretch' }} />
            <Image
                source={{ uri: item.avatar }}
                style={{
                    width: 48, height: 48, borderRadius: 24,
                    margin: 12, backgroundColor: AURORA.cardAlt,
                }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    {item.name}
                </Text>
                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                    {item.program} · {item.time}
                </Text>
            </View>
            <View style={{
                backgroundColor: style.badgeBg, borderRadius: 12,
                paddingHorizontal: 10, paddingVertical: 5, marginRight: 8,
                borderWidth: 1, borderColor: `${style.text}44`,
            }}>
                <Text style={{
                    color: style.text, fontSize: 10,
                    fontWeight: '800', letterSpacing: 0.5,
                }}>
                    {item.risk}
                </Text>
            </View>
            <ChevronRight size={16} color={AURORA.textMuted} style={{ marginRight: 12 }} />
        </TouchableOpacity>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorHomeScreen() {
    const { user } = useAuth();
    const [studentCount, setStudentCount] = useState<number>(0);
    const [recentFlags, setRecentFlags] = useState<FlagItem[]>([]);
    const [criticalRisks, setCriticalRisks] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const firstName = user?.full_name?.split(' ')[0] || 'Counselor';

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                const students = await firestoreService.getUsersByRole('student');
                if (cancelled) return;

                setStudentCount(students.length);

                // Fetch recent mood logs for students (limit to first 15 for performance)
                const limit = Math.min(15, students.length);
                const studentsWithMood = await Promise.all(
                    students.slice(0, limit).map(async (s) => {
                        try {
                            const logs = await firestoreService.getMoodLogs(s.id);
                            const latest = logs[0];
                            return {
                                student: s,
                                stressLevel: (latest as any)?.stress_level,
                                energyLevel: (latest as any)?.energy_level,
                                lastLogDate: (latest as any)?.log_date,
                            };
                        } catch {
                            return { student: s, stressLevel: undefined, energyLevel: undefined, lastLogDate: undefined };
                        }
                    })
                );

                if (cancelled) return;

                const flags: FlagItem[] = studentsWithMood
                    .map(({ student, stressLevel, energyLevel, lastLogDate }) => ({
                        id: student.id,
                        name: student.full_name || 'Student',
                        program: formatProgram(student.department, student.year_level),
                        time: lastLogDate ? formatTimeAgo(new Date(lastLogDate)) : 'No logs',
                        risk: deriveRiskFromMood(stressLevel, energyLevel) as RiskLevel,
                        avatar: student.avatar_url || `https://i.pravatar.cc/50?u=${student.id}`,
                    }))
                    .sort((a, b) => {
                        const order = { 'HIGH RISK': 0, 'MEDIUM': 1, 'RESOLVED': 2 };
                        return (order[a.risk] ?? 2) - (order[b.risk] ?? 2);
                    });

                setRecentFlags(flags);
                setCriticalRisks(flags.filter((f) => f.risk === 'HIGH RISK').length);
            } catch {
                if (!cancelled) {
                    setRecentFlags([]);
                    setCriticalRisks(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
                }}>
                    <Image
                        source={{ uri: user?.avatar_url || `https://i.pravatar.cc/50?u=${user?.id || 'counselor'}` }}
                        style={{
                            width: 50, height: 50, borderRadius: 25,
                            borderWidth: 2, borderColor: AURORA.green,
                            backgroundColor: AURORA.card,
                        }}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{
                            color: AURORA.textSec, fontSize: 11,
                            fontWeight: '700', letterSpacing: 1.4,
                        }}>
                            COUNSELOR PORTAL
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                            Hello, {firstName}
                        </Text>
                    </View>
                    <TouchableOpacity style={{
                        width: 42, height: 42, borderRadius: 21,
                        backgroundColor: AURORA.card,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <Bell size={20} color={AURORA.textSec} />
                        <View style={{
                            position: 'absolute', top: 9, right: 9,
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: AURORA.red,
                            borderWidth: 1.5, borderColor: AURORA.card,
                        }} />
                    </TouchableOpacity>
                </View>

                {/* ── Scrollable Content ───────────────────────────────── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                >
                    {/* Dashboard Overview */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 14,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                            Dashboard Overview
                        </Text>
                        
                    </View>

                    {/* Stat Cards Row 1 */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <StatCard
                            icon={
                                <View style={{
                                    width: 46, height: 46, borderRadius: 23,
                                    backgroundColor: 'rgba(45,107,255,0.15)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Users size={22} color={AURORA.blue} />
                                </View>
                            }
                            count={studentCount}
                            label="Total Students"
                        />
                        <StatCard
                            icon={
                                <View style={{
                                    width: 46, height: 46, borderRadius: 23,
                                    backgroundColor: 'rgba(239,68,68,0.2)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <AlertTriangle size={22} color={AURORA.red} />
                                </View>
                            }
                            count={criticalRisks}
                            label="Critical Risks"
                            cardBg="rgba(90,0,20,0.5)"
                        />
                    </View>

                    {/* Stat Cards Row 2 */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
                        <StatCard
                            icon={
                                <View style={{ position: 'relative', width: 46, height: 46 }}>
                                    <View style={{
                                        width: 46, height: 46, borderRadius: 23,
                                        backgroundColor: 'rgba(45,107,255,0.12)',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <MessageSquare size={22} color={AURORA.blue} />
                                    </View>
                                    <View style={{
                                        position: 'absolute', top: 2, right: 2,
                                        width: 10, height: 10, borderRadius: 5,
                                        backgroundColor: AURORA.blue,
                                        borderWidth: 1.5, borderColor: AURORA.card,
                                    }} />
                                </View>
                            }
                            count={3}
                            label="New Messages"
                        />
                        <StatCard
                            icon={
                                <View style={{
                                    width: 46, height: 46, borderRadius: 23,
                                    backgroundColor: 'rgba(254,189,3,0.12)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Calendar size={22} color={AURORA.amber} />
                                </View>
                            }
                            count={8}
                            label="Pending Follow-ups"
                        />
                    </View>

                    {/* Recent Flags */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 14,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                            Recent Flags
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(counselor)/risk-center')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <Text style={{ color: AURORA.blue, fontSize: 13, fontWeight: '700' }}>
                                VIEW ALL
                            </Text>
                            <ChevronRight size={14} color={AURORA.blue} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                Loading...
                            </Text>
                        </View>
                    ) : recentFlags.length === 0 ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                No student flags to display.
                            </Text>
                        </View>
                    ) : (
                        recentFlags.map((item) => <FlagRow key={item.id} item={item} />)
                    )}
                </ScrollView>

                {/* ── Schedule Consultation CTA ─────────────────────────── */}
                <View style={{
                    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8,
                    backgroundColor: AURORA.bgDeep,
                }}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: AURORA.blue, borderRadius: 30,
                            paddingVertical: 16, flexDirection: 'row',
                            alignItems: 'center', justifyContent: 'center', gap: 8,
                            shadowColor: AURORA.blue,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
                        }}
                    >
                        <Plus size={20} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                            Schedule Consultation
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
