import { AppText as Text } from "../../components/common/AppText";
/**
 * Admin Counselors Screen
 * Lists all counselors and allows admin to approve/reject pending signups.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, Check, X, UserPlus } from 'lucide-react-native';
import { firestoreService } from '../../services/firebase-firestore.service';
import { authService } from '../../services/firebase-auth.service';
import { AURORA } from '../../constants/aurora-colors';
import type { CounselorApprovalStatus } from '../../services/firebase-auth.service';
import {
    counselorApprovalBadgeStatus,
    isCounselorPendingApproval,
} from '../../utils/counselorApprovalForAdmin';
import {
    COLLEGES,
    type CollegeCode,
    resolveCollegeCodeFromUserData,
    isCollegeCode,
} from '../../constants/colleges';
import { AuroraConfirmModal } from '../../components/common/AuroraConfirmModal';
import {
    InfoGuideModal,
    InfoGuideOverlay,
    type InfoGuideContent,
} from '../../components/common/InfoGuideModal';
import { buildFeedback } from '../../utils/aurora-feedback';
import { AddCounselorModal } from '../../components/admin/AddCounselorModal';
import { writeAuditLogTrusted } from '../../services/trusted-backend.service';

interface CounselorUser {
    id: string;
    full_name: string;
    email: string;
    approval_status?: CounselorApprovalStatus;
    college_code?: string;
    department?: string;
    contact_number?: string;
}

function StatusBadge({ status }: { status: CounselorApprovalStatus }) {
    const config: Record<string, { label: string; bg: string; color: string }> = {
        pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' },
        approved: { label: 'Approved', bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' },
        rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' },
    };
    const { label, bg, color } = config[status] || config.approved;
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
    const [approveTarget, setApproveTarget] = useState<CounselorUser | null>(null);
    const [approveCollege, setApproveCollege] = useState<CollegeCode | ''>('');
    const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);
    const [rejectTarget, setRejectTarget] = useState<CounselorUser | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);

    const loadCounselors = async () => {
        try {
            const users = await firestoreService.getUsersByRole('counselor');
            setCounselors(users as unknown as CounselorUser[]);
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

    const openApproveModal = (c: CounselorUser) => {
        setApproveTarget(c);
        const existing = resolveCollegeCodeFromUserData(
            c as unknown as Record<string, unknown>,
        );
        setApproveCollege(existing && isCollegeCode(existing) ? existing : '');
    };

    const submitApproveWithCollege = async () => {
        if (!approveTarget) return;
        if (!approveCollege || !isCollegeCode(approveCollege)) {
            setFeedback(
                buildFeedback(
                    'College required',
                    'Select the college this counselor serves before approving.',
                    'error',
                ),
            );
            return;
        }
        setUpdatingId(approveTarget.id);
        try {
            await authService.updateCounselorApproval(approveTarget.id, 'approved', {
                college_code: approveCollege,
            });
            setApproveTarget(null);
            setApproveCollege('');
            await loadCounselors();
        } catch {
            setFeedback(buildFeedback('Error', 'Could not approve. Please try again.', 'error'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReject = (c: CounselorUser) => {
        setRejectTarget(c);
    };

    const pendingCount = counselors.filter((c) =>
        isCounselorPendingApproval(c as unknown as Record<string, unknown>),
    ).length;

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
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', flex: 1 }}>Counselors</Text>
                    <TouchableOpacity
                        onPress={() => setAddModalOpen(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: AURORA.blue,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                        }}
                    >
                        <UserPlus size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Add</Text>
                    </TouchableOpacity>
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
                                <Text style={{ color: AURORA.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                                    Use Add to provision counselor accounts. Legacy pending signups may still appear here.
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
                                            {c.contact_number ? (
                                                <Text style={{ color: AURORA.textMuted, fontSize: 12, marginTop: 2 }}>{c.contact_number}</Text>
                                            ) : null}
                                        </View>
                                        <StatusBadge
                                            status={counselorApprovalBadgeStatus(
                                                c as unknown as Record<string, unknown>,
                                            )}
                                        />
                                    </View>
                                    {isCounselorPendingApproval(
                                        c as unknown as Record<string, unknown>,
                                    ) && (
                                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                            <TouchableOpacity
                                                onPress={() => openApproveModal(c)}
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

                <Modal
                    visible={approveTarget != null}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => !updatingId && setApproveTarget(null)}
                >
                    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
                        <SafeAreaView style={{ flex: 1 }}>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                paddingHorizontal: 20, paddingVertical: 14,
                                borderBottomWidth: 1, borderBottomColor: AURORA.border,
                            }}>
                                <TouchableOpacity
                                    onPress={() => !updatingId && setApproveTarget(null)}
                                    style={{ paddingVertical: 4 }}
                                >
                                    <Text style={{ color: AURORA.textSec, fontSize: 15 }}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Assign college</Text>
                                <View style={{ width: 56 }} />
                            </View>
                            <Text style={{
                                color: AURORA.textSec, fontSize: 13, lineHeight: 19,
                                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
                            }}>
                                Choose the college for{' '}
                                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                                    {approveTarget?.full_name ?? 'this counselor'}
                                </Text>
                                . They will only see students from this college after approval.
                            </Text>
                            <ScrollView
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {COLLEGES.map((row) => (
                                    <TouchableOpacity
                                        key={row.code}
                                        onPress={() => setApproveCollege(row.code)}
                                        style={{
                                            paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: approveCollege === row.code ? 'rgba(45,107,255,0.55)' : AURORA.border,
                                            backgroundColor: approveCollege === row.code ? 'rgba(45,107,255,0.14)' : AURORA.card,
                                        }}
                                    >
                                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                                            {row.code} — {row.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    onPress={() => void submitApproveWithCollege()}
                                    disabled={!!updatingId}
                                    style={{
                                        marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                                        backgroundColor: 'rgba(34, 197, 94, 0.2)', borderWidth: 1,
                                        borderColor: 'rgba(34, 197, 94, 0.45)', opacity: updatingId ? 0.6 : 1,
                                    }}
                                >
                                    {updatingId === approveTarget?.id ? (
                                        <ActivityIndicator color="#86EFAC" />
                                    ) : (
                                        <Text style={{ color: '#86EFAC', fontSize: 16, fontWeight: '700' }}>
                                            Approve counselor
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                            <InfoGuideOverlay
                                guide={feedback}
                                onClose={() => setFeedback(null)}
                            />
                        </SafeAreaView>
                    </View>
                </Modal>

                <AuroraConfirmModal
                    visible={!!rejectTarget}
                    title="Reject Counselor"
                    body={
                        rejectTarget
                            ? `Reject ${rejectTarget.full_name}'s counselor request?`
                            : ''
                    }
                    cancelLabel="Cancel"
                    confirmLabel="Reject"
                    busy={!!updatingId}
                    onCancel={() => {
                        if (!updatingId) setRejectTarget(null);
                    }}
                    onConfirm={() => {
                        if (!rejectTarget) return;
                        void (async () => {
                            setUpdatingId(rejectTarget.id);
                            try {
                                await authService.updateCounselorApproval(
                                    rejectTarget.id,
                                    'rejected',
                                );
                                setRejectTarget(null);
                                await loadCounselors();
                            } catch {
                                setFeedback(
                                    buildFeedback(
                                        'Error',
                                        'Could not reject. Please try again.',
                                        'error',
                                    ),
                                );
                            } finally {
                                setUpdatingId(null);
                            }
                        })();
                    }}
                />

                <InfoGuideModal
                    guide={approveTarget ? null : feedback}
                    onClose={() => setFeedback(null)}
                />

                <AddCounselorModal
                    visible={addModalOpen}
                    onClose={() => setAddModalOpen(false)}
                    onCreated={() => void loadCounselors()}
                />
            </SafeAreaView>
        </View>
    );
}
