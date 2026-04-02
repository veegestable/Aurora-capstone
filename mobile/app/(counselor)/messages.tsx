/**
 * Counselor Messages - messages.tsx
 * ====================================
 * Route: /(counselor)/messages
 * Shows student conversations with unread/priority indicators.
 * Supports appointment scheduling: counselor can invite students to sessions.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, ArrowLeft, AlertTriangle,
    Info, Plus, Send, RotateCcw, UserPlus,
} from 'lucide-react-native';
import { useAuth } from '../../src/stores/AuthContext';
import { useMessagesContactStore, type MessageContact } from '../../src/stores/messagesContactStore';
import { firestoreService } from '../../src/services/firebase-firestore.service';
import { auditLogsService } from '../../src/services/audit-logs.service';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import { router, useLocalSearchParams } from 'expo-router';
import { isSessionTimeExpired } from '../../src/utils/dateHelpers';
import { resolveSessionsDocIdForSessionCard } from '../../src/utils/sessionInviteIds';
import SendSessionInviteModal, { type SessionInviteData } from '../../src/components/counselor/SendSessionInviteModal';
import SessionCard, { type SessionCardData } from '../../src/components/counselor/SessionCard';
import SessionAttendanceModal, { type AttendanceStatus } from '../../src/components/counselor/SessionAttendanceModal';
import SessionRequestReceivedCard from '../../src/components/counselor/SessionRequestReceivedCard';
import SelectStudentModal from '../../src/components/counselor/SelectStudentModal';
import * as Clipboard from 'expo-clipboard';

// ─── Types ─────────────────────────────────────────────────────────────────────
type FilterTab = 'All Messages' | 'Unread' | 'Priority';
type Conversation = MessageContact;

interface TextChatMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'text';
    text: string;
    time: string;
}

interface SessionChatMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'session';
    session: SessionCardData;
    time: string;
}

interface SessionRequestChatMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'session_request';
    sessionRequest: {
        id: string;
        sessionId: string | null;
        preferredTime: string;
        note: string;
        status: string;
    };
    time: string;
}

type ChatMessage = TextChatMessage | SessionChatMessage | SessionRequestChatMessage;

const AUTO_ACCEPTED_PREFIX = '__AUTO_ACCEPTED__';

// ─── Conversation Row ──────────────────────────────────────────────────────────
function ConversationRow({
    item, onPress,
}: {
    item: Conversation;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: AURORA.card, borderRadius: 16,
                marginBottom: 10, overflow: 'hidden',
                borderWidth: 1, borderColor: AURORA.border,
            }}
        >
            {/* Left color border */}
            {item.borderColor && (
                <View style={{ width: 3, backgroundColor: item.borderColor, alignSelf: 'stretch' }} />
            )}
            {!item.borderColor && <View style={{ width: 3 }} />}

            {/* Avatar */}
            <View style={{ position: 'relative', margin: 12 }}>
                <LetterAvatar name={item.name} size={52} avatarUrl={item.avatar || undefined} />
                {item.isOnline && (
                    <View style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 13, height: 13, borderRadius: 7,
                        backgroundColor: AURORA.green,
                        borderWidth: 2, borderColor: AURORA.card,
                    }} />
                )}
            </View>

            {/* Content */}
            <View style={{ flex: 1, paddingRight: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{
                            color: '#FFFFFF', fontSize: 15,
                            fontWeight: item.isUnread ? '700' : '600',
                        }}>
                            {item.name}
                        </Text>
                        {item.isAlerted && (
                            <AlertTriangle size={13} color={AURORA.orange} />
                        )}
                    </View>
                    <Text style={{
                        fontSize: 12,
                        color: item.isUnread ? AURORA.blue : AURORA.textSec,
                        fontWeight: item.isUnread ? '700' : '400',
                    }}>
                        {item.time}
                    </Text>
                </View>
                <Text
                    numberOfLines={1}
                    style={{
                        color: item.isAlerted ? AURORA.orange : AURORA.textSec,
                        fontSize: 13,
                        fontWeight: item.isAlerted ? '500' : '400',
                    }}
                >
                    {item.preview}
                </Text>
            </View>

            {/* Unread dot */}
            <View style={{ width: 24, alignItems: 'center', marginRight: 12 }}>
                {item.isUnread && (
                    <View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: AURORA.blue,
                    }} />
                )}
            </View>
        </TouchableOpacity>
    );
}

// ─── Chat View ─────────────────────────────────────────────────────────────────
function ChatView({ contact, onBack }: { contact: Conversation; onBack: () => void }) {
    const { user } = useAuth();
    const conversationId = contact.conversationId || (user?.id ? `${user.id}_${contact.id}` : '');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sending, setSending] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showInviteModalForSessionRequest, setShowInviteModalForSessionRequest] = useState<string | null>(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<SessionCardData | null>(null);

    useEffect(() => {
        if (!conversationId || !user?.id) {
            setLoadingMessages(false);
            return;
        }
        let cancelled = false;
        firestoreService.getMessages(conversationId, user.id).then((msgs) => {
            if (!cancelled) {
                setMessages(msgs as ChatMessage[]);
            }
        }).catch(() => {
            if (!cancelled) setMessages([]);
        }).finally(() => {
            if (!cancelled) setLoadingMessages(false);
        });
        return () => { cancelled = true; };
    }, [conversationId, user?.id]);

    const sendMessage = async () => {
        const text = message.trim();
        if (!text || !user?.id || !conversationId || sending) return;
        setSending(true);
        try {
            const msgId = await firestoreService.sendTextMessage(conversationId, user.id, text);
            setMessages(prev => [...prev, {
                id: msgId, senderId: 'me', type: 'text',
                text,
                time: 'Just now',
            }]);
            setMessage('');
        } catch (e) {
            console.error('Failed to send message:', e);
        } finally {
            setSending(false);
        }
    };

    const handleSendSessionInvite = async (data: SessionInviteData) => {
        if (!user?.id || !conversationId || sending) return;
        const formatSlot = (d: Date) => ({
            date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        });
        const timeSlots = [
            data.primaryDate && formatSlot(data.primaryDate),
            data.alternativeDate && formatSlot(data.alternativeDate),
            data.finalDate && formatSlot(data.finalDate),
        ].filter(Boolean) as { date: string; time: string }[];
        if (timeSlots.length === 0) return;
        const headline = timeSlots[0];
        setSending(true);
        try {
            const sessionId = await firestoreService.createCounselorSessionInvite(
                user.id,
                contact.id,
                timeSlots,
                { note: data.note }
            );
            const sessionData: SessionCardData & { note?: string; timeSlots?: { date: string; time: string }[] } = {
                id: sessionId,
                type: 'invite',
                title: 'Academic Guidance',
                counselorName: user.full_name || 'Counselor',
                date: headline.date,
                time: headline.time,
                location: 'Guidance Office, West Wing',
                note: data.note,
                timeSlots,
            };
            const msgId = await firestoreService.sendSessionMessage(conversationId, user.id, sessionData);
            setMessages(prev => [...prev, {
                id: msgId, senderId: 'me', type: 'session',
                session: sessionData,
                time: 'Just now',
            }]);
        } catch (e) {
            console.error('Failed to send session invite:', e);
        } finally {
            setSending(false);
        }
    };

    const handlePlusPress = () => setShowInviteModal(true);

    const parsePreferredTimeToSlot = (preferredTime: string): { date: string; time: string } => {
        const normalized = preferredTime.replace(/\s+at\s+/i, ', ');
        const parts = normalized.split(', ');
        if (parts.length < 2) return { date: preferredTime, time: '' };
        const time = parts[parts.length - 1];
        const date = parts.slice(0, -1).join(', ');
        return { date, time };
    };

    const handleAcceptSessionRequest = async (sessionId: string | null, preferredTime: string) => {
        if (!sessionId || !preferredTime || sending || !conversationId || !user?.id) return;
        setSending(true);
        try {
            const slot = parsePreferredTimeToSlot(preferredTime);
            await firestoreService.confirmSlot(sessionId, slot);
            await firestoreService.updateSessionRequestMessageStatus(conversationId, sessionId, 'confirmed');
            const autoMsgId = await firestoreService.sendTextMessage(
                conversationId,
                user.id,
                `${AUTO_ACCEPTED_PREFIX}Just accepted your request`
            );

            setMessages((prev) => {
                const updated = prev.map((m) => {
                    if (m.type === 'session_request' && m.sessionRequest.sessionId === sessionId) {
                        return { ...m, sessionRequest: { ...m.sessionRequest, status: 'confirmed' } };
                    }
                    return m;
                });
                return [
                    ...updated,
                    { id: autoMsgId, senderId: 'me', type: 'text', text: `${AUTO_ACCEPTED_PREFIX}Just accepted your request`, time: 'Just now' },
                ];
            });
        } catch (e) {
            console.error('Failed to accept session request:', e);
        } finally {
            setSending(false);
        }
    };

    const handleProposeNewTime = (sessionId: string | null) => {
        if (sessionId) setShowInviteModalForSessionRequest(sessionId);
    };

    const handleProposeSlotsFromModal = async (data: SessionInviteData, sessionId: string) => {
        if (!sessionId || !user?.id || !conversationId || sending) return;
        const formatSlot = (d: Date | null) => d ? {
            date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        } : null;
        const slots = [
            data.primaryDate && formatSlot(data.primaryDate),
            data.alternativeDate && formatSlot(data.alternativeDate),
            data.finalDate && formatSlot(data.finalDate),
        ].filter(Boolean) as { date: string; time: string }[];
        if (slots.length === 0) return;
        const primary = data.primaryDate!;
        setSending(true);
        try {
            await firestoreService.proposeSlots(sessionId, slots);
            const sessionData: SessionCardData & { note?: string; timeSlots?: { date: string; time: string }[] } = {
                id: sessionId,
                type: 'invite',
                title: 'Academic Guidance',
                counselorName: user.full_name || 'Counselor',
                date: primary.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                time: primary.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                location: 'Guidance Office, West Wing',
                note: data.note,
                timeSlots: slots,
            };
            const keepMsgId = await firestoreService.updateSessionInviteMessageScheduleForSession(
                conversationId,
                user.id,
                sessionId,
                sessionData
            );
            // Replace the existing session card in local UI to avoid duplicates until next refresh.
            setMessages((prev) => [
                ...prev.filter(
                    (m) =>
                        !(
                            m.type === 'session' &&
                            m.senderId === 'me' &&
                            (m.session?.id === sessionId || (m.session as any)?.linkedSessionId === sessionId)
                        )
                ),
                { id: keepMsgId, senderId: 'me' as const, type: 'session' as const, session: sessionData, time: 'Just now' },
            ]);
            setShowInviteModalForSessionRequest(null);
        } catch (e) {
            console.error('Failed to propose slots:', e);
        } finally {
            setSending(false);
        }
    };

    const mapAttendanceToStatus = (s: AttendanceStatus): 'completed' | 'missed' | 'rescheduled' => {
        if (s === 'showed_up') return 'completed';
        if (s === 'did_not_show') return 'missed';
        return 'rescheduled';
    };

    const handleMarkAttendance = async (status: AttendanceStatus) => {
        const sessionId = selectedSessionForAttendance?.id;
        if (sessionId && !sessionId.startsWith('session_')) {
            try {
                await firestoreService.markSessionAttendance(sessionId, mapAttendanceToStatus(status));
            } catch (e) {
                console.error('Failed to mark attendance:', e);
            }
        }
        setShowAttendanceModal(false);
        setSelectedSessionForAttendance(null);
    };

    const handleCopyText = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
        } catch (e) {
            console.error('Failed to copy text:', e);
        }
    };

    const confirmDeleteMessage = (messageId: string, messageType: string) => {
        if (!user?.id) return;
        Alert.alert('Delete message', 'Are you sure you want to delete this message?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await firestoreService.deleteConversationMessage(conversationId, messageId);
                    await auditLogsService.write({
                        performedBy: user.id,
                        performedByRole: user.role,
                        action: 'delete_chat_message',
                        targetType: 'conversation_message',
                        targetId: messageId,
                        metadata: { conversationId, messageType },
                    });
                    setMessages((prev) => {
                        const original = prev.find((m) => m.id === messageId);
                        const senderId = original?.senderId ?? 'me';
                        const time = (original as any)?.time ?? 'Just now';

                        const placeholderText =
                            messageType === 'session'
                                ? '[Deleted session]'
                                : messageType === 'session_request'
                                    ? '[Deleted session request]'
                                    : '[Deleted message]';

                        return prev.map((m) =>
                            m.id !== messageId
                                ? m
                                : ({ id: messageId, senderId, type: 'text', text: placeholderText, time } as any)
                        );
                    });
                },
            },
        ]);
    };

    return (
        <>
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: AURORA.bgMessages }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                }}>
                    <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                            {contact.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{
                                width: 8, height: 8, borderRadius: 4,
                                backgroundColor: contact.isOnline ? AURORA.green : AURORA.textMuted,
                            }} />
                            <Text style={{
                                color: contact.isOnline ? AURORA.green : AURORA.textMuted,
                                fontSize: 12,
                            }}>
                                {contact.isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{ padding: 4 }}>
                        <Info size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                {/* Privacy Banner */}
                <View style={{
                    backgroundColor: 'rgba(124,58,237,0.12)',
                    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
                    borderRadius: 12, marginHorizontal: 16, marginTop: 12,
                    paddingVertical: 10, paddingHorizontal: 14,
                }}>
                    <Text style={{
                        color: AURORA.purple, fontSize: 11, fontWeight: '700',
                        textAlign: 'center', letterSpacing: 0.8,
                    }}>
                        COUNSELOR — STUDENT PRIVATE CONVERSATION
                    </Text>
                </View>

                {/* Messages */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {loadingMessages ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={AURORA.blue} />
                        </View>
                    ) : (
                    messages.map(msg => {
                        const isMe = msg.senderId === 'me';
                        const isAutoAccepted = msg.type === 'text' && msg.text.startsWith(AUTO_ACCEPTED_PREFIX);
                        const isDeletedPlaceholder = msg.type === 'text' && msg.text.startsWith('[Deleted');
                        const displayText = isAutoAccepted ? msg.text.replace(AUTO_ACCEPTED_PREFIX, '').trim() : msg.type === 'text' ? msg.text : '';
                        return (
                            <View key={msg.id} style={{ marginBottom: 16 }}>
                                <Text style={{
                                    color: AURORA.textSec, fontSize: 11, marginBottom: 4,
                                    textAlign: isMe ? 'right' : 'left',
                                }}>
                                    {isMe ? 'You' : contact.name}
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-end', gap: 8,
                                }}>
                                    {!isMe && (
                                        <LetterAvatar name={contact.name} size={32} avatarUrl={contact.avatar || undefined} />
                                    )}
                    {msg.type === 'text' ? (
                                        <Pressable
                                            onLongPress={() => {
                                                if (!user?.id) return;
                                                const canDelete = isMe;
                                                const canCopy = !msg.text.startsWith('[Deleted');
                                                const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
                                                if (canCopy) {
                                                    buttons.push({
                                                        text: 'Copy',
                                                        onPress: async () => {
                                                            await handleCopyText(msg.text);
                                                            Alert.alert('Copied', 'Message copied to clipboard.');
                                                        },
                                                    });
                                                }
                                                if (canDelete) {
                                                    buttons.push({
                                                        text: 'Delete',
                                                        style: 'destructive',
                                                        onPress: () => confirmDeleteMessage(msg.id, 'text'),
                                                    });
                                                }
                                                buttons.push({ text: 'Cancel', style: 'cancel' });
                                                Alert.alert('Message options', undefined, buttons as any);
                                            }}
                                        >
                                            <View style={{
                                                maxWidth: '78%',
                                                backgroundColor: isMe ? AURORA.blue : AURORA.card,
                                                borderRadius: 16,
                                                borderBottomLeftRadius: isMe ? 16 : 4,
                                                borderBottomRightRadius: isMe ? 4 : 16,
                                                paddingHorizontal: 14, paddingVertical: 10,
                                            }}>
                                                <Text style={{
                                                    color: isAutoAccepted ? AURORA.green : isDeletedPlaceholder ? AURORA.textMuted : '#FFFFFF',
                                                    fontSize: 14,
                                                    lineHeight: 20,
                                                }}>
                                                    {displayText}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ) : msg.type === 'session_request' && !isMe ? (
                                        <SessionRequestReceivedCard
                                            data={{
                                                sessionId: msg.sessionRequest.sessionId ?? '',
                                                title: 'Session Request',
                                                preferredTime: msg.sessionRequest.preferredTime || undefined,
                                                note: msg.sessionRequest.note,
                                                status: msg.sessionRequest.status,
                                                isExpired: msg.sessionRequest.preferredTime
                                                    ? isSessionTimeExpired(msg.sessionRequest.preferredTime)
                                                    : false,
                                            }}
                                            onAccept={
                                                msg.sessionRequest.sessionId && msg.sessionRequest.preferredTime
                                                    ? () => handleAcceptSessionRequest(msg.sessionRequest.sessionId!, msg.sessionRequest.preferredTime)
                                                    : undefined
                                            }
                                            onProposeNewTime={
                                                msg.sessionRequest.sessionId
                                                    ? () => handleProposeNewTime(msg.sessionRequest.sessionId)
                                                    : undefined
                                            }
                                        />
                                    ) : msg.type === 'session' ? (
                                        <Pressable
                                            onLongPress={() => {
                                                // Session cards: delete only (no copy) and only for messages you sent.
                                                if (!isMe) return;
                                                confirmDeleteMessage(msg.id, 'session');
                                            }}
                                        >
                                            <SessionCard
                                                data={msg.session}
                                                isFromMe={isMe}
                                                onMarkAttendance={() => {
                                                    setSelectedSessionForAttendance(msg.session);
                                                    setShowAttendanceModal(true);
                                                }}
                                                onReschedule={(() => {
                                                    const sid = resolveSessionsDocIdForSessionCard(msg.session);
                                                    return sid
                                                        ? () => {
                                                            setShowInviteModal(false);
                                                            setShowInviteModalForSessionRequest(sid);
                                                        }
                                                        : undefined;
                                                })()}
                                            />
                                        </Pressable>
                                    ) : null}
                                    {isMe && (
                                        <LetterAvatar name={user?.full_name ?? 'You'} size={32} avatarUrl={user?.avatar_url} />
                                    )}
                                </View>
                            </View>
                        );
                    })
                    )}
                </ScrollView>

                {/* Input Bar */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: AURORA.border, gap: 10,
                    }}>
                        <TouchableOpacity
                            onPress={handlePlusPress}
                            style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: AURORA.card, alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: AURORA.border,
                            }}
                        >
                            <Plus size={18} color={AURORA.textSec} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1, backgroundColor: AURORA.card, borderRadius: 24,
                                paddingHorizontal: 16, paddingVertical: 10,
                                color: '#FFFFFF', fontSize: 14,
                                borderWidth: 1, borderColor: AURORA.border,
                            }}
                            placeholder="Type a message..."
                            placeholderTextColor={AURORA.textMuted}
                            value={message}
                            onChangeText={setMessage}
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={sending}
                            style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: AURORA.blue,
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Send size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
            </SafeAreaView>
        </KeyboardAvoidingView>

            {/* Send Session Invite Modal (from + button) */}
            <SendSessionInviteModal
                visible={showInviteModal}
                student={{
                    id: contact.id,
                    name: contact.name,
                    avatar: contact.avatar,
                    program: contact.program,
                    studentId: contact.studentId,
                }}
                counselorName={user?.full_name}
                onClose={() => setShowInviteModal(false)}
                onSend={handleSendSessionInvite}
            />

            {/* Propose New Time Modal (from session request card) */}
            {showInviteModalForSessionRequest && (
                <SendSessionInviteModal
                    visible={!!showInviteModalForSessionRequest}
                    student={{
                        id: contact.id,
                        name: contact.name,
                        avatar: contact.avatar,
                        program: contact.program,
                        studentId: contact.studentId,
                    }}
                    counselorName={user?.full_name}
                    onClose={() => setShowInviteModalForSessionRequest(null)}
                    onSend={(data) => handleProposeSlotsFromModal(data, showInviteModalForSessionRequest!)}
                />
            )}

            {/* Session Attendance Modal (post-session verification) */}
            {selectedSessionForAttendance && (
                <SessionAttendanceModal
                    visible={showAttendanceModal}
                    student={{ id: contact.id, name: contact.name, avatar: contact.avatar }}
                    session={{
                        date: selectedSessionForAttendance.date,
                        timeRange: selectedSessionForAttendance.time,
                    }}
                    onClose={() => { setShowAttendanceModal(false); setSelectedSessionForAttendance(null); }}
                    onMarkLater={() => { setShowAttendanceModal(false); setSelectedSessionForAttendance(null); }}
                    onMarkStatus={handleMarkAttendance}
                />
            )}
        </>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorMessagesScreen() {
    const { user } = useAuth();
    const { contacts, setContacts } = useMessagesContactStore();
    const [activeTab, setActiveTab] = useState<FilterTab>('All Messages');
    const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const { studentId } = useLocalSearchParams<{ studentId?: string }>();
    const [autoOpenLocked, setAutoOpenLocked] = useState(false);

    useEffect(() => {
        // Reset when navigating to a different student thread.
        setAutoOpenLocked(false);
    }, [studentId]);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        firestoreService.getConversations(user.id)
            .then((convos) => {
                if (!cancelled) setContacts(convos);
            })
            .catch(() => {
                if (!cancelled) setContacts([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [user?.id, setContacts]);

    useEffect(() => {
        if (loading) return;
        if (!studentId) return;
        if (autoOpenLocked) return;
        if (selectedContact) return;
        const found = contacts.find((c) => c.id === studentId);
        if (found) {
            setSelectedContact(found);
            setAutoOpenLocked(true); // prevent immediate re-opening after user presses back
        }
    }, [loading, studentId, contacts, selectedContact]);

    const refreshConversations = () => {
        if (!user?.id) return;
        firestoreService.getConversations(user.id)
            .then(setContacts)
            .catch(() => setContacts([]));
    };

    const handleConversationCreated = async (studentId: string) => {
        if (!user?.id) return;
        try {
            const convos = await firestoreService.getConversations(user.id);
            setContacts(convos);
            const added = convos.find((c) => c.id === studentId);
            if (added) setSelectedContact(added);
        } catch {
            refreshConversations();
        }
    };

    if (selectedContact) {
        return (
            <ChatView
                contact={selectedContact}
                onBack={() => {
                    setSelectedContact(null);
                    refreshConversations();
                    setAutoOpenLocked(true);
                    router.replace('/(counselor)/messages');
                }}
            />
        );
    }

    const TABS: FilterTab[] = ['All Messages', 'Unread', 'Priority'];

    const filtered = activeTab === 'All Messages'
        ? contacts
        : activeTab === 'Unread'
            ? contacts.filter(c => c.isUnread)
            : contacts.filter(c => c.isAlerted);

    const unreadCount = contacts.filter(c => c.isUnread).length;

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header + Filter Tabs (fixed top section) ─────────────── */}
                <View style={{ flexShrink: 0, backgroundColor: AURORA.bgMessages, zIndex: 1 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
                        borderBottomWidth: 1, borderBottomColor: AURORA.border,
                        gap: 12,
                    }}>
                        <LetterAvatar name={user?.full_name ?? 'Counselor'} size={46} avatarUrl={user?.avatar_url} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
                                Messages
                            </Text>
                            <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 1 }}>
                                {unreadCount} Unread Conversation{unreadCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={{ alignItems: 'center', padding: 6 }}
                            onPress={() => router.push('/(counselor)/session-history')}
                            activeOpacity={0.7}
                        >
                            <RotateCcw size={22} color={AURORA.textSec} />
                            <Text style={{ color: AURORA.textSec, fontSize: 9, fontWeight: '600', marginTop: 2 }}>
                                History
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 6 }} activeOpacity={0.7}>
                            <Search size={22} color={AURORA.textSec} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ padding: 6 }}
                            activeOpacity={0.7}
                            onPress={() => setShowAddStudentModal(true)}
                        >
                            <UserPlus size={22} color={AURORA.blue} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
                            style={{ flexGrow: 0 }}
                        >
                            {TABS.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    activeOpacity={0.75}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        paddingHorizontal: 16, paddingVertical: 5, borderRadius: 30, marginTop: 8,
                                        backgroundColor: activeTab === tab ? AURORA.blue : 'transparent',
                                        borderWidth: 1.5,
                                        borderColor: activeTab === tab ? AURORA.blue : AURORA.borderLight,
                                        minWidth: 88,
                                        alignSelf: 'flex-start',
                                    }}
                                >
                                    <Text style={{
                                        color: activeTab === tab ? '#FFFFFF' : AURORA.textSec,
                                        fontSize: 13, fontWeight: activeTab === tab ? '700' : '500',
                                    }}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* ── Conversation List (scrollable, fills remaining space) ─── */}
                <ScrollView
                    style={{ flex: 1, minHeight: 0 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={AURORA.blue} />
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, marginTop: 12 }}>
                                Loading conversations...
                            </Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, textAlign: 'center' }}>
                                {contacts.length === 0
                                    ? 'No conversations yet. Tap + to add a student, or invite from the Risk Center.'
                                    : 'No conversations match this filter.'}
                            </Text>
                        </View>
                    ) : (
                        filtered.map(item => (
                            <ConversationRow
                                key={item.id}
                                item={item}
                                onPress={() => setSelectedContact(item)}
                            />
                        ))
                    )}
                </ScrollView>

                {user?.id ? (
                    <SelectStudentModal
                        visible={showAddStudentModal}
                        onClose={() => setShowAddStudentModal(false)}
                        existingStudentIds={contacts.map((c) => c.id)}
                        counselorId={user.id}
                        counselorName={user?.full_name ?? 'Counselor'}
                        counselorAvatar={user?.avatar_url}
                        onConversationCreated={handleConversationCreated}
                    />
                ) : null}
            </SafeAreaView>
        </View>
    );
}
