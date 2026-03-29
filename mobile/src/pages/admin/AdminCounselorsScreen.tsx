/**
 * Admin Counselors Screen
 * Lists all counselors and allows admin to approve/reject pending signups.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Check, X } from 'lucide-react-native';
import { firestoreService } from '../../services/firebase-firestore.service';
import { authService } from '../../services/firebase-auth.service';
import { AURORA } from '../../constants/aurora-colors';
import type { CounselorApprovalStatus } from '../../services/firebase-auth.service';

interface CounselorUser {
    id: string;
    full_name: string;
    email: string;
    approval_status?: CounselorApprovalStatus;
}

function StatusBadge({ status }: { status?: CounselorApprovalStatus }) {
    const config: Record<string, { label: string; bg: string; color: string }> = {
        pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' },
        approved: { label: 'Approved', bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' },
        rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' },
    };
    const s = status || 'pending';
    const { label, bg, color } = config[s] || config.pending;
    return (
        <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
        </View>
    );
}

export default function AdminCounselorsScreen() {
    const router = useRouter();
    const [counselors, setCounselors] = useState<CounselorUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const loadCounselors = async () => {
        try {
            const users = await firestoreService.getUsersByRole('counselor');
            setCounselors(users as CounselorUser[]);
        } catch (e) {
            console.error('Failed to load counselors:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCounselors();
    }, []);

    const handleApprove = async (c: CounselorUser) => {
        Alert.alert('Approve Counselor', `Approve ${c.full_name} as a counselor?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    setUpdatingId(c.id);
                    try {
                        await authService.updateCounselorApproval(c.id, 'approved');
                        await loadCounselors();
                    } catch (e) {
                        Alert.alert('Error', 'Could not approve. Please try again.');
                    } finally {
                        setUpdatingId(null);
                    }
                },
            },
        ]);
    };

    const handleReject = async (c: CounselorUser) => {
        Alert.alert('Reject Counselor', `Reject ${c.full_name}'s counselor request?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject',
                style: 'destructive',
                onPress: async () => {
                    setUpdatingId(c.id);
                    try {
                        await authService.updateCounselorApproval(c.id, 'rejected');
                        await loadCounselors();
                    } catch (e) {
                        Alert.alert('Error', 'Could not reject. Please try again.');
                    } finally {
                        setUpdatingId(null);
                    }
                },
            },
        ]);
    };

    const pendingCount = counselors.filter(c => c.approval_status === 'pending').length;

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 16,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                }}>
                    {router.canGoBack() ? (
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
                            <ArrowLeft size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 34 }} />
                    )}
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Counselors</Text>
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={AURORA.blue} />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCounselors(); }} tintColor={AURORA.blue} />
                        }
                    >
                        {pendingCount > 0 && (
                            <View style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                borderRadius: 12, padding: 14, marginBottom: 20,
                                borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
                            }}>
                                <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>
                                    {pendingCount} counselor{pendingCount !== 1 ? 's' : ''} awaiting approval
                                </Text>
                            </View>
                        )}

                        {counselors.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                                <Users size={48} color={AURORA.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={{ color: AURORA.textSec, fontSize: 16 }}>No counselors yet</Text>
                                <Text style={{ color: AURORA.textMuted, fontSize: 13, marginTop: 4 }}>
                                    Counselors sign up from the login screen and appear here for approval.
                                </Text>
                            </View>
                        ) : (
                            counselors.map(c => (
                                <View
                                    key={c.id}
                                    style={{
                                        backgroundColor: AURORA.card,
                                        borderRadius: 14, padding: 16, marginBottom: 12,
                                        borderWidth: 1, borderColor: AURORA.border,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{c.full_name || 'Unknown'}</Text>
                                            <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 2 }}>{c.email}</Text>
                                        </View>
                                        <StatusBadge status={c.approval_status} />
                                    </View>
                                    {c.approval_status === 'pending' && (
                                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                            <TouchableOpacity
                                                onPress={() => handleApprove(c)}
                                                disabled={!!updatingId}
                                                style={{
                                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingVertical: 10, borderRadius: 10,
                                                    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
                                                }}
                                            >
                                                {updatingId === c.id ? (
                                                    <ActivityIndicator size="small" color="#22C55E" />
                                                ) : (
                                                    <>
                                                        <Check size={18} color="#22C55E" />
                                                        <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 14 }}>Approve</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleReject(c)}
                                                disabled={!!updatingId}
                                                style={{
                                                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingVertical: 10, borderRadius: 10,
                                                    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
                                                }}
                                            >
                                                <X size={18} color="#EF4444" />
                                                <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 14 }}>Reject</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
