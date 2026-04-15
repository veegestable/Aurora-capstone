/**
 * Student Messages Screen
 * Receives messages and session invites from counselors.
 * Loads from Firestore.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, Image, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Settings2, Info, Plus, Send, PenSquare, Phone } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../stores/AuthContext';
import { firestoreService } from '../../services/firebase-firestore.service';
import { AURORA } from '../../constants/aurora-colors';
import { STUDENT_TAB_BAR_BOTTOM_CLEARANCE } from '../../../constants/student-tab-bar';
import { LetterAvatar } from '../../components/common/LetterAvatar';
import ScheduleInviteCard, { type ScheduleInviteData, type TimeSlot } from '../../components/student/ScheduleInviteCard';
import SessionRequestCard, { type SessionRequestData } from '../../components/student/SessionRequestCard';
import SessionRequestDetailsModal from '../../components/student/SessionRequestDetailsModal';
import StudentSessionRequestModal, { type SessionRequestFormData } from '../../components/student/StudentSessionRequestModal';
import SelectCounselorModal, { type Counselor } from '../../components/student/SelectCounselorModal';
import { parsePreferredTimeToDate } from '../../utils/dateHelpers';
import { auditLogsService } from '../../services/audit-logs.service';
import { subscribeToUsersPresence } from '../../services/firebase-presence.service';
import { usePeerPresence } from '../../hooks/usePeerPresence';
import * as Clipboard from 'expo-clipboard';

type TabType = 'All messages' | 'Unread';

const AUTO_ACCEPTED_PREFIX = '__AUTO_ACCEPTED__';

interface CounselorContact {
    id: string;
    conversationId: string;
    name: string;
    preview: string;
    time: string;
    avatar: string;
    isOnline: boolean;
    isUnread: boolean;
}

interface TextMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'text';
    text: string;
    time: string;
}

interface SessionMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'session';
    session: ScheduleInviteData & {
        timeSlots?: TimeSlot[];
        note?: string;
        sessionStatus?: string;
        agreedSlot?: { date: string; time: string };
    };
    time: string;
}

interface SessionRequestMessage {
    id: string;
    senderId: 'me' | 'them';
    type: 'session_request';
    sessionRequest: SessionRequestData;
    time: string;
}

type ChatMessage = TextMessage | SessionMessage | SessionRequestMessage;

// ─── Contact Row ───────────────────────────────────────────────────────────────
function ContactRow({
    item,
    onPress,
}: {
    item: CounselorContact;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 0,
                borderBottomWidth: 1,
                borderBottomColor: AURORA.border,
            }}
        >
            <View style={{ position: 'relative', marginRight: 12 }}>
                <LetterAvatar name={item.name} size={52} avatarUrl={item.avatar || undefined} />
                <View
                    style={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 13,
                        height: 13,
                        borderRadius: 7,
                        backgroundColor: item.isOnline ? AURORA.green : AURORA.textMuted,
                        borderWidth: 2,
                        borderColor: AURORA.bgMessages,
                    }}
                />
            </View>
            <View style={{ flex: 1 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                    }}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
                    <Text
                        style={{
                            fontSize: 12,
                            fontWeight: item.isUnread ? '700' : '400',
                            color: item.isUnread ? AURORA.blue : AURORA.textSec,
                            letterSpacing: item.isUnread ? 0.5 : 0,
                        }}
                    >
                        {item.time}
                    </Text>
                </View>
                <Text style={{ color: AURORA.textSec, fontSize: 13 }} numberOfLines={1}>
                    {item.preview}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Direct Message Chat ───────────────────────────────────────────────────────
function DirectMessageView({
    contact,
    onBack,
    autoOpenSessionRequestModal = false,
}: {
    contact: CounselorContact;
    onBack: () => void;
    autoOpenSessionRequestModal?: boolean;
}) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sending, setSending] = useState(false);
    const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedSessionRequest, setSelectedSessionRequest] = useState<SessionRequestData | null>(null);
    const [editingSessionRequest, setEditingSessionRequest] = useState<SessionRequestData | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const peerOnline = usePeerPresence(contact.id);
    const openedByParamRef = useRef(false);

    useEffect(() => {
        if (!autoOpenSessionRequestModal) return;
        if (openedByParamRef.current) return;
        openedByParamRef.current = true;
        setShowSessionRequestModal(true);
    }, [autoOpenSessionRequestModal]);

    useEffect(() => {
        if (!contact.conversationId || !user?.id) {
            setLoadingMessages(false);
            return;
        }
        firestoreService.markConversationAsRead(contact.conversationId, user.id).catch(() => {});
        setLoadingMessages(true);
        const unsub = firestoreService.subscribeConversationMessages(
            contact.conversationId,
            user.id,
            (msgs) => {
                setMessages(msgs as ChatMessage[]);
                setLoadingMessages(false);
            },
            () => {
                setMessages([]);
                setLoadingMessages(false);
            }
        );
        return unsub;
    }, [contact.conversationId, user?.id]);

    // Always scroll to the latest message when opening a conversation.
    useEffect(() => {
        if (loadingMessages) return;
        if (messages.length === 0) return;
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [loadingMessages, messages.length]);

    const sendMessage = async () => {
        const text = message.trim();
        if (!text || !user?.id || !contact.conversationId || sending) return;
        setSending(true);
        try {
            await firestoreService.sendTextMessage(contact.conversationId, user.id, text);
            setMessage('');
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            console.error('Failed to send message:', e);
        } finally {
            setSending(false);
        }
    };

    const handleCopyText = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            Alert.alert('Copied', 'Message copied to clipboard.');
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
                    await firestoreService.deleteConversationMessage(contact.conversationId, messageId);
                    await auditLogsService.write({
                        performedBy: user.id,
                        performedByRole: user.role,
                        action: 'delete_chat_message',
                        targetType: 'conversation_message',
                        targetId: messageId,
                        metadata: { conversationId: contact.conversationId, messageType },
                    });
                },
            },
        ]);
    };

    const handleConfirmSession = async (slot: TimeSlot, invite: ScheduleInviteData) => {
        if (!user?.id || !contact.conversationId || sending) return;
        const sid = invite.id?.trim();
        if (!sid || String(sid).startsWith('session_')) {
            Alert.alert(
                'Cannot confirm',
                'This invite is missing a valid session link. Ask your counselor to send the times again.'
            );
            return;
        }
        setSending(true);
        try {
            await firestoreService.studentConfirmFinalSlot(sid, user.id, slot, {
                conversationId: contact.conversationId,
                counselorId: contact.id,
            });

            // Automated green "Accepted" message for the thread.
            await firestoreService.sendTextMessage(
                contact.conversationId,
                user.id,
                `${AUTO_ACCEPTED_PREFIX}Just accepted your request`
            );

            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
            console.error('Failed to confirm session time:', e);
            Alert.alert('Could not confirm session', message);
        } finally {
            setSending(false);
        }
    };

    const handleSendSessionRequest = async (data: SessionRequestFormData) => {
        if (!user?.id || !contact.conversationId || sending) return;
        setSending(true);
        try {
            const preferredTimeStr = data.preferredDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });

            // Edit flow: update the existing session request message card instead of creating a new one.
            if (editingSessionRequest?.id && editingSessionRequest.sessionId) {
                await firestoreService.updateSessionRequestSchedule(
                    contact.conversationId,
                    user.id,
                    editingSessionRequest.id,
                    editingSessionRequest.sessionId,
                    preferredTimeStr,
                    data.note
                );

                setShowSessionRequestModal(false);
                setEditingSessionRequest(null);
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                return;
            }

            // New request flow: create a new session request card.
            await firestoreService.sendSessionRequest(
                contact.conversationId,
                user.id,
                data.preferredDate,
                data.note
            );

            setShowSessionRequestModal(false);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            console.error('Failed to send session request:', e);
        } finally {
            setSending(false);
        }
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
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: AURORA.border,
                    }}
                >
                    <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <LetterAvatar name={contact.name} size={40} avatarUrl={contact.avatar || undefined} />
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
                                {contact.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: peerOnline ? AURORA.green : AURORA.textMuted,
                                    }}
                                />
                                <Text
                                    style={{
                                        color: peerOnline ? AURORA.green : AURORA.textMuted,
                                        fontSize: 12,
                                    }}
                                >
                                    {peerOnline ? 'Online now' : 'Offline'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={{ padding: 4 }}>
                            <Phone size={20} color={AURORA.textSec} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 4 }}>
                            <Info size={22} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Privacy Banner */}
                <View
                    style={{
                        backgroundColor: 'rgba(124,58,237,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(124,58,237,0.3)',
                        borderRadius: 12,
                        marginHorizontal: 16,
                        marginTop: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                    }}
                >
                    <Text
                        style={{
                            color: AURORA.purple,
                            fontSize: 11,
                            fontWeight: '700',
                            textAlign: 'center',
                            letterSpacing: 0.8,
                        }}
                    >
                        THIS IS A PRIVATE CONVERSATION WITH YOUR COUNSELOR.
                    </Text>
                </View>

                {/* Date label */}
                <Text
                    style={{
                        color: AURORA.textMuted,
                        fontSize: 12,
                        fontWeight: '600',
                        textAlign: 'center',
                        marginTop: 16,
                        marginBottom: 8,
                        letterSpacing: 0.5,
                    }}
                >
                    TODAY
                </Text>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {loadingMessages ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={AURORA.blue} />
                        </View>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === 'me';
                            const isAutoAccepted =
                                msg.type === 'text' && msg.text.startsWith(AUTO_ACCEPTED_PREFIX);
                            const displayText = isAutoAccepted
                                ? msg.text.replace(AUTO_ACCEPTED_PREFIX, '').trim()
                                : msg.type === 'text'
                                    ? msg.text
                                    : '';
                            const senderName = isMe ? 'You' : contact.name;
                            const messageContent = msg.type === 'text' ? (
                                                <Pressable
                                                    onLongPress={() => {
                                                        const canCopy = !displayText.startsWith('[Deleted');
                                                        const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
                                                        if (canCopy) {
                                                            buttons.push({
                                                                text: 'Copy',
                                                                onPress: () => handleCopyText(displayText),
                                                            });
                                                        }
                                                        if (isMe) {
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
                                                    <View
                                                        style={{
                                                            minWidth: 80,
                                                            maxWidth: 280,
                                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                            backgroundColor: isMe ? AURORA.blue : AURORA.card,
                                                            borderRadius: 18,
                                                            borderBottomLeftRadius: isMe ? 18 : 4,
                                                            borderBottomRightRadius: isMe ? 4 : 18,
                                                            paddingHorizontal: 16,
                                                            paddingVertical: 12,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color:
                                                                    isAutoAccepted
                                                                        ? AURORA.green
                                                                        : displayText.startsWith('[Deleted')
                                                                            ? AURORA.textMuted
                                                                            : '#FFFFFF',
                                                                fontSize: 14,
                                                                lineHeight: 20,
                                                            }}
                                                        >
                                                            {displayText}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: 11,
                                                                marginTop: 4,
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            {msg.time}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            ) : msg.type === 'session_request' ? (
                                                <Pressable
                                                    onLongPress={() => {
                                                        if (!isMe) return;
                                                        confirmDeleteMessage(msg.id, 'session_request');
                                                    }}
                                                >
                                                    <View>
                                                        <SessionRequestCard
                                                            data={msg.sessionRequest}
                                                            isFromMe={isMe}
                                                            onViewDetails={() => {
                                                                setSelectedSessionRequest(msg.sessionRequest);
                                                                setShowDetailsModal(true);
                                                            }}
                                                            onEdit={() => {
                                                                setEditingSessionRequest(msg.sessionRequest);
                                                                setShowSessionRequestModal(true);
                                                            }}
                                                        />
                                                        <Text
                                                            style={{
                                                                color: 'rgba(255,255,255,0.6)',
                                                                fontSize: 11,
                                                                marginTop: 6,
                                                                textAlign: isMe ? 'right' : 'left',
                                                            }}
                                                        >
                                                            {msg.time}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            ) : (
                                                <Pressable
                                                    onLongPress={() => {
                                                        if (!isMe) return;
                                                        confirmDeleteMessage(msg.id, 'session');
                                                    }}
                                                >
                                                    <View>
                                                        <ScheduleInviteCard
                                                            data={{
                                                                ...msg.session,
                                                                note: msg.session.note,
                                                                timeSlots: msg.session.timeSlots,
                                                                sessionStatus: msg.session.sessionStatus,
                                                                agreedSlot: msg.session.agreedSlot,
                                                            }}
                                                            senderLabel="Aurora Academic Support"
                                                            isFromMe={isMe}
                                                            confirmBusy={sending}
                                                            onConfirm={
                                                                !isMe &&
                                                                msg.session.id &&
                                                                !String(msg.session.id).startsWith('session_') &&
                                                                !(
                                                                    msg.session.sessionStatus &&
                                                                    ['confirmed', 'completed', 'missed', 'cancelled'].includes(
                                                                        msg.session.sessionStatus
                                                                    )
                                                                )
                                                                    ? (slot) =>
                                                                          handleConfirmSession(slot, {
                                                                              ...msg.session,
                                                                              id: msg.session.id,
                                                                          })
                                                                    : undefined
                                                            }
                                                        />
                                                        <Text
                                                            style={{
                                                                color: 'rgba(255,255,255,0.6)',
                                                                fontSize: 11,
                                                                marginTop: 6,
                                                                textAlign: isMe ? 'right' : 'left',
                                                            }}
                                                        >
                                                            {msg.time}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            );
                            return (
                                <View key={msg.id} style={{ marginBottom: 16 }}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                                            alignItems: 'flex-end',
                                            gap: 8,
                                        }}
                                    >
                                        {!isMe && (
                                            <LetterAvatar name={contact.name} size={34} avatarUrl={contact.avatar || undefined} />
                                        )}
                                        <View style={{ maxWidth: '78%' }}>
                                            <Text
                                                style={{
                                                    color: AURORA.textSec,
                                                    fontSize: 11,
                                                    marginBottom: 4,
                                                    textAlign: isMe ? 'right' : 'left',
                                                }}
                                            >
                                                {senderName}
                                            </Text>
                                            {messageContent}
                                        </View>
                                        {isMe && (
                                            <LetterAvatar name={user?.full_name ?? 'You'} size={34} avatarUrl={user?.avatar_url} />
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Input Bar */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderTopWidth: 1,
                            borderTopColor: AURORA.border,
                            gap: 10,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                setEditingSessionRequest(null);
                                setShowSessionRequestModal(true);
                            }}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: AURORA.card,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: AURORA.border,
                            }}
                        >
                            <Plus size={18} color={AURORA.textSec} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: AURORA.card,
                                borderRadius: 24,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                color: '#FFFFFF',
                                fontSize: 14,
                                borderWidth: 1,
                                borderColor: AURORA.border,
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
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: AURORA.blue,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Send size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <Text
                        style={{
                            color: AURORA.textMuted,
                            fontSize: 11,
                            textAlign: 'center',
                            marginBottom: 8,
                            paddingHorizontal: 16,
                        }}
                    >
                        Messages are encrypted and shared only with your counselor.
                    </Text>
            </SafeAreaView>
        </KeyboardAvoidingView>

        <StudentSessionRequestModal
            visible={showSessionRequestModal}
            initialPreferredDate={editingSessionRequest?.preferredTime ? parsePreferredTimeToDate(editingSessionRequest.preferredTime) : null}
            initialNote={editingSessionRequest?.note ?? undefined}
            onClose={() => {
                setShowSessionRequestModal(false);
                setEditingSessionRequest(null);
            }}
            onSend={handleSendSessionRequest}
        />
        <SessionRequestDetailsModal
            visible={showDetailsModal}
            data={selectedSessionRequest}
            onClose={() => {
                setShowDetailsModal(false);
                setSelectedSessionRequest(null);
            }}
        />
        </>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function MessagesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ counselorId?: string; openSessionRequest?: string }>();
    const [activeTab, setActiveTab] = useState<TabType>('Counselors');
    const [selectedContact, setSelectedContact] = useState<CounselorContact | null>(null);
    const [contacts, setContacts] = useState<CounselorContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSelectCounselorModal, setShowSelectCounselorModal] = useState(false);
    const [onlineByCounselorId, setOnlineByCounselorId] = useState<Record<string, boolean>>({});
    const [autoOpenSessionRequestForContact, setAutoOpenSessionRequestForContact] = useState(false);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        firestoreService
            .getConversationsForStudent(user.id)
            .then((convos) => {
                if (!cancelled) setContacts(convos as CounselorContact[]);
            })
            .catch(() => {
                if (!cancelled) setContacts([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        if (contacts.length === 0) {
            setOnlineByCounselorId({});
            return;
        }
        return subscribeToUsersPresence(
            contacts.map((c) => c.id),
            setOnlineByCounselorId
        );
    }, [contacts]);

    const refreshConversations = () => {
        if (!user?.id) return;
        firestoreService
            .getConversationsForStudent(user.id)
            .then(setContacts as any)
            .catch(() => setContacts([]));
    };

    const handleSelectCounselor = async (counselor: Counselor) => {
        if (!user?.id) return;
        try {
            await firestoreService.addConversation(
                counselor.id,
                {
                    id: user.id,
                    name: user.full_name ?? 'Student',
                    avatar: user.avatar_url ?? '',
                },
                {
                    name: counselor.full_name ?? 'Counselor',
                    avatar: counselor.avatar_url,
                }
            );
            const contact: CounselorContact = {
                id: counselor.id,
                conversationId: `${counselor.id}_${user.id}`,
                name: counselor.full_name ?? 'Counselor',
                preview: 'No messages yet',
                time: 'Just now',
                avatar: counselor.avatar_url ?? '',
                isOnline: false,
                isUnread: false,
            };
            setSelectedContact(contact);
            refreshConversations();
        } catch (e) {
            console.error('Failed to start conversation:', e);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        const counselorId = typeof params.counselorId === 'string' ? params.counselorId : '';
        const shouldOpenRequest = params.openSessionRequest === '1';
        if (!counselorId) return;

        const openThreadFromParam = async () => {
            const existing = contacts.find((c) => c.id === counselorId);
            if (existing) {
                setSelectedContact(existing);
                setAutoOpenSessionRequestForContact(shouldOpenRequest);
                router.replace('/(student)/messages');
                return;
            }

            try {
                const users = await firestoreService.getUsersByRole('counselor');
                const counselor = (users as Counselor[]).find((u) => u.id === counselorId);
                if (!counselor) return;

                await firestoreService.addConversation(
                    counselor.id,
                    {
                        id: user.id,
                        name: user.full_name ?? 'Student',
                        avatar: user.avatar_url ?? '',
                    },
                    {
                        name: counselor.full_name ?? 'Counselor',
                        avatar: counselor.avatar_url,
                    }
                );

                const contact: CounselorContact = {
                    id: counselor.id,
                    conversationId: `${counselor.id}_${user.id}`,
                    name: counselor.full_name ?? 'Counselor',
                    preview: 'No messages yet',
                    time: 'Just now',
                    avatar: counselor.avatar_url ?? '',
                    isOnline: false,
                    isUnread: false,
                };
                setSelectedContact(contact);
                setAutoOpenSessionRequestForContact(shouldOpenRequest);
                router.replace('/(student)/messages');
                refreshConversations();
            } catch (e) {
                console.error('Failed opening counselor thread from params:', e);
            }
        };

        void openThreadFromParam();
    }, [params.counselorId, params.openSessionRequest, contacts, user?.id]);

    if (selectedContact) {
        return (
            <DirectMessageView
                contact={{
                    ...selectedContact,
                    isOnline: onlineByCounselorId[selectedContact.id] ?? false,
                }}
                autoOpenSessionRequestModal={autoOpenSessionRequestForContact}
                onBack={() => {
                    setSelectedContact(null);
                    setAutoOpenSessionRequestForContact(false);
                    refreshConversations();
                }}
            />
        );
    }

    const TABS: TabType[] = ['All messages', 'Unread'];
    const visibleContacts = activeTab === 'Unread'
        ? contacts.filter((c) => c.isUnread)
        : contacts;

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                    <Text
                        style={{
                            color: AURORA.blue,
                            fontSize: 12,
                            fontWeight: '700',
                            letterSpacing: 0.8,
                            marginBottom: 4,
                        }}
                    >
                        COUNSELOR CONVERSATIONS
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>
                            Messages
                        </Text>
                        {/* <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Search size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Settings2 size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View> */}
                    </View>
                    <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                        You are chatting with your assigned counselors here.
                    </Text>
                </View>

                {/* Tabs */}
                <View
                    style={{
                        flexDirection: 'row',
                        paddingHorizontal: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: AURORA.border,
                        marginTop: 8,
                    }}
                >
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={{
                                paddingVertical: 10,
                                marginRight: 20,
                                borderBottomWidth: 2,
                                borderBottomColor: activeTab === tab ? AURORA.blue : 'transparent',
                            }}
                        >
                            <Text
                                style={{
                                    color: activeTab === tab ? AURORA.blue : AURORA.textSec,
                                    fontSize: 14,
                                    fontWeight: activeTab === tab ? '700' : '400',
                                }}
                            >
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Contact List */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingBottom: STUDENT_TAB_BAR_BOTTOM_CLEARANCE,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={AURORA.blue} />
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, marginTop: 12 }}>
                                Loading conversations...
                            </Text>
                        </View>
                    ) : visibleContacts.length > 0 ? (
                        visibleContacts.map((item) => (
                            <ContactRow
                                key={item.conversationId}
                                item={{
                                    ...item,
                                    isOnline: onlineByCounselorId[item.id] ?? false,
                                }}
                                onPress={() =>
                                    setSelectedContact({
                                        ...item,
                                        isOnline: onlineByCounselorId[item.id] ?? false,
                                    })
                                }
                            />
                        ))
                    ) : activeTab === 'Unread' ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, textAlign: 'center' }}>
                                No unread counselor messages right now.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, textAlign: 'center' }}>
                                No conversations yet. Your counselor will invite you when they're ready to connect.
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* FAB - open counselor list to start a conversation */}
                <TouchableOpacity
                    onPress={() => setShowSelectCounselorModal(true)}
                    style={{
                        position: 'absolute',
                        bottom: 20,
                        right: 20,
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: AURORA.blue,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: AURORA.blue,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    <PenSquare size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>

            <SelectCounselorModal
                visible={showSelectCounselorModal}
                onClose={() => setShowSelectCounselorModal(false)}
                onSelect={handleSelectCounselor}
            />
        </View>
    );
}
