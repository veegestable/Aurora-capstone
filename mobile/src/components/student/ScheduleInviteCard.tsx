/**
 * ScheduleInviteCard - Session scheduling card for students
 * Displays counselor's session invite with selectable time slots
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Pressable, Platform, Modal, ScrollView } from 'react-native';
import { AppText as Text } from '../common/AppText';
import { Calendar, Check, X, Clock, User, FileText, MapPin } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { isSessionDocOpenRequestExpired24h } from '../../utils/dateHelpers';

export interface TimeSlot {
    date: string;
    time: string;
}

export interface ScheduleInviteData {
    id: string;
    title?: string;
    counselorName?: string;
    note?: string;
    timeSlots?: TimeSlot[];
    date?: string;
    time?: string;
    location?: string;
    /** From `sessions.status` merged in when loading messages — drives confirmed UI. */
    sessionStatus?: string;
    /** From `sessions.finalSlot` when agreed — optional display. */
    agreedSlot?: { date: string; time: string };
    /** From `sessions.createdAt` — used with `sessionDocUpdatedAt` for 24h open-invite expiry. */
    sessionDocCreatedAt?: unknown;
    /** From `sessions.updatedAt` — counselor edits reset the student response window. */
    sessionDocUpdatedAt?: unknown;
}

interface ScheduleInviteCardProps {
    data: ScheduleInviteData;
    senderLabel?: string;
    isFromMe?: boolean;
    /** Disables confirm while parent is saving (avoids double-submit). */
    confirmBusy?: boolean;
    onConfirm?: (selectedSlot: TimeSlot) => void;
}

export default function ScheduleInviteCard({
    data,
    senderLabel = 'Aurora Academic Support',
    isFromMe = false,
    confirmBusy = false,
    onConfirm,
}: ScheduleInviteCardProps) {
    const st = data.sessionStatus;
    const stLower = (st ?? '').toLowerCase();
    const settled =
        st != null && ['confirmed', 'completed', 'missed', 'cancelled'].includes(st);

    const hasLockedSlot = !!(
        data.agreedSlot &&
        typeof data.agreedSlot.date === 'string' &&
        data.agreedSlot.date.trim() !== ''
    );

    const expiredByServerStatus = stLower === 'expired';

    const expiredBy24hOpenInvite =
        !hasLockedSlot &&
        !settled &&
        (stLower === 'pending' || stLower === 'requested') &&
        isSessionDocOpenRequestExpired24h({
            status: stLower || 'pending',
            createdAt: data.sessionDocCreatedAt,
            updatedAt: data.sessionDocUpdatedAt,
        });

    const inviteNoLongerActionable =
        settled || expiredByServerStatus || expiredBy24hOpenInvite;

    const showInviteExpiredBanner = expiredByServerStatus || expiredBy24hOpenInvite;

    const slots = data.timeSlots && data.timeSlots.length > 0
        ? data.timeSlots
        : data.date && data.time
            ? [{ date: data.date, time: data.time }]
            : [];
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [detailOpen, setDetailOpen] = useState(false);

    const handleConfirm = () => {
        if (confirmBusy) return;
        if (slots[selectedIndex] && onConfirm) {
            onConfirm(slots[selectedIndex]);
        }
    };

    const dateTimeLine = hasLockedSlot
        ? `${data.agreedSlot!.date}, ${data.agreedSlot!.time}`
        : slots.length > 0
            ? slots.map((s) => `${s.date}, ${s.time}`).join('\n')
            : 'Not set';

    const statusLabel = settled
        ? (st === 'confirmed' ? 'Confirmed' : st === 'completed' ? 'Completed' : st === 'missed' ? 'Missed' : 'Cancelled')
        : showInviteExpiredBanner ? 'Expired' : 'Pending';

    return (
        <View style={styles.wrapper}>
        <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
            <Text style={styles.senderLabel}>{senderLabel}</Text>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Calendar size={20} color={AURORA.blue} />
                </View>
                <Text style={styles.title}>{data.title || 'Schedule Next Session'}</Text>
            </View>
            {data.note && (
                <Text style={styles.quote}>"{data.note}"</Text>
            )}
            {showInviteExpiredBanner && (
                <View style={[styles.statusBanner, styles.statusBannerMuted]}>
                    <Text style={[styles.statusBannerText, styles.statusBannerTextMuted]}>
                        This invite is no longer available. If you still need a session, message your
                        counselor for a new time.
                    </Text>
                </View>
            )}
            {settled && st !== 'confirmed' && !showInviteExpiredBanner && (
                <View
                    style={[
                        styles.statusBanner,
                        st === 'confirmed' ? styles.statusBannerOk : styles.statusBannerMuted,
                    ]}
                >
                    <Text
                        style={[
                            styles.statusBannerText,
                            st === 'confirmed' ? styles.statusBannerTextOk : styles.statusBannerTextMuted,
                        ]}
                    >
                        {st === 'confirmed'
                            ? data.agreedSlot
                                ? `Scheduled — ${data.agreedSlot.date}, ${data.agreedSlot.time}`
                                : 'Scheduled — saved to your calendar in Messages.'
                            : st === 'completed'
                              ? 'This session was completed.'
                              : st === 'missed'
                                ? 'This session was marked as missed.'
                                : 'This session was cancelled.'}
                    </Text>
                </View>
            )}
            {slots.length > 0 && (
                <View style={styles.slots}>
                    {slots.map((slot, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.slotRow}
                            onPress={() => !inviteNoLongerActionable && setSelectedIndex(i)}
                            activeOpacity={inviteNoLongerActionable ? 1 : 0.8}
                            disabled={inviteNoLongerActionable}
                        >
                            <Calendar size={14} color={AURORA.textSec} style={styles.slotIcon} />
                            <Text style={styles.slotText}>{slot.date}, {slot.time}</Text>
                            <View style={[
                                styles.radio,
                                selectedIndex === i && styles.radioSelected,
                            ]}>
                                {selectedIndex === i && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {onConfirm && slots.length > 0 && !inviteNoLongerActionable && (
                <Pressable
                    style={({ pressed }) => [
                        styles.confirmBtnPressable,
                        pressed && !confirmBusy && styles.confirmBtnOuterPressed,
                        confirmBusy && styles.confirmBtnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={confirmBusy}
                    android_ripple={{
                        color: 'rgba(255, 255, 255, 0.22)',
                        borderless: false,
                    }}
                >
                    <View style={styles.confirmBtnFill}>
                        <View style={styles.confirmBtnInner}>
                            <View style={styles.confirmBtnIconCircle}>
                                <Check size={18} color="#ffffff" strokeWidth={2.75} />
                            </View>
                            <Text style={styles.confirmBtnText}>
                                {confirmBusy ? 'Confirming…' : 'Confirm slot'}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            )}
            <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() => setDetailOpen(true)}
                activeOpacity={0.8}
            >
                <Text style={styles.viewDetailsBtnText}>View Details</Text>
            </TouchableOpacity>
        </View>
        <View style={[styles.tail, isFromMe ? styles.tailRight : styles.tailLeft]} />

        <Modal
            visible={detailOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setDetailOpen(false)}
        >
            <View style={styles.sheetOverlay}>
                <TouchableOpacity
                    style={styles.sheetBackdrop}
                    activeOpacity={1}
                    onPress={() => setDetailOpen(false)}
                />
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Session Details</Text>
                        <TouchableOpacity
                            onPress={() => setDetailOpen(false)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.sheetScroll}
                        contentContainerStyle={styles.sheetScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[
                            styles.statusPill,
                            statusLabel === 'Confirmed' || statusLabel === 'Completed'
                                ? styles.statusPillOk
                                : statusLabel === 'Expired' || statusLabel === 'Missed' || statusLabel === 'Cancelled'
                                    ? styles.statusPillDanger
                                    : styles.statusPillPending,
                        ]}>
                            <Text style={styles.statusPillText}>{statusLabel}</Text>
                        </View>

                        <View style={styles.sheetSection}>
                            <View style={styles.sheetSectionHeader}>
                                <Calendar size={18} color={AURORA.blue} />
                                <Text style={styles.sheetSectionLabel}>Session Title</Text>
                            </View>
                            <Text style={styles.sheetSectionValue}>
                                {data.title || 'Academic Guidance'}
                            </Text>
                        </View>

                        {data.counselorName ? (
                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <User size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Counselor</Text>
                                </View>
                                <Text style={styles.sheetSectionValue}>{data.counselorName}</Text>
                            </View>
                        ) : null}

                        <View style={styles.sheetSection}>
                            <View style={styles.sheetSectionHeader}>
                                <Clock size={18} color={AURORA.blue} />
                                <Text style={styles.sheetSectionLabel}>
                                    {hasLockedSlot ? 'Confirmed Time' : 'Proposed Times'}
                                </Text>
                            </View>
                            <Text style={styles.sheetSectionValue}>{dateTimeLine}</Text>
                        </View>

                        {data.location ? (
                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <MapPin size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Location</Text>
                                </View>
                                <Text style={styles.sheetSectionValue}>{data.location}</Text>
                            </View>
                        ) : null}

                        {data.note ? (
                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <FileText size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Counselor's Note</Text>
                                </View>
                                <Text style={styles.sheetSectionValue}>{data.note}</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        maxWidth: 300,
    },
    card: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    cardTailRight: {
        borderBottomRightRadius: 4,
    },
    cardTailLeft: {
        borderBottomLeftRadius: 4,
    },
    tail: {
        position: 'absolute',
        bottom: 10,
        width: 0,
        height: 0,
        borderTopWidth: 6,
        borderBottomWidth: 6,
    },
    tailRight: {
        right: -8,
        borderLeftWidth: 12,
        borderRightWidth: 0,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: AURORA.cardDark,
        borderRightColor: 'transparent',
    },
    tailLeft: {
        left: -8,
        borderLeftWidth: 0,
        borderRightWidth: 12,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: AURORA.cardDark,
    },
    senderLabel: {
        color: AURORA.textMuted,
        fontSize: 11,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    quote: {
        color: AURORA.textSec,
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 14,
        lineHeight: 20,
    },
    slots: {
        gap: 8,
        marginBottom: 14,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    slotIcon: {
        marginRight: 8,
    },
    slotText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: AURORA.textSec,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: AURORA.blue,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: AURORA.blue,
    },
    /** Pressable wrapper only — solid paint lives on `confirmBtnFill` so Android ripple does not flatten/hide the background. */
    confirmBtnPressable: {
        width: '100%',
        marginTop: 6,
        borderRadius: 12,
        overflow: 'hidden',
    },
    confirmBtnFill: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#22c55e',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#14532d',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.22,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    confirmBtnOuterPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.985 }],
    },
    confirmBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 8,
    },
    confirmBtnIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    confirmBtnDisabled: {
        opacity: 0.55,
    },
    statusBanner: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    statusBannerOk: {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderColor: 'rgba(34,197,94,0.35)',
    },
    statusBannerMuted: {
        backgroundColor: 'rgba(148,163,184,0.12)',
        borderColor: 'rgba(148,163,184,0.3)',
    },
    statusBannerText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    statusBannerTextOk: {
        color: '#86efac',
    },
    statusBannerTextMuted: {
        color: AURORA.textSec,
    },
    viewDetailsBtn: {
        marginTop: 8,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AURORA.border,
        alignItems: 'center',
    },
    viewDetailsBtnText: {
        color: AURORA.blue,
        fontSize: 13,
        fontWeight: '700',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: AURORA.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        maxHeight: '70%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
    },
    sheetTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    sheetScroll: {
        maxHeight: 400,
    },
    sheetScrollContent: {
        padding: 20,
        gap: 18,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPillOk: {
        backgroundColor: 'rgba(34,197,94,0.2)',
    },
    statusPillDanger: {
        backgroundColor: 'rgba(239,68,68,0.2)',
    },
    statusPillPending: {
        backgroundColor: 'rgba(45,107,255,0.2)',
    },
    statusPillText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    sheetSection: {
        gap: 6,
    },
    sheetSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sheetSectionLabel: {
        color: AURORA.textSec,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    sheetSectionValue: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
        paddingLeft: 26,
    },
});
