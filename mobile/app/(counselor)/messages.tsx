/**
 * Counselor Messages - messages.tsx
 * ====================================
 * Route: /(counselor)/messages
 * Shows student conversations with unread/priority indicators.
 */

import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, PenSquare, ArrowLeft, AlertTriangle,
    Info, Plus, Send,
} from 'lucide-react-native';
import { useAuth } from '../../src/stores/AuthContext';
import { AURORA } from '../../src/constants/aurora-colors';

// ─── Types ─────────────────────────────────────────────────────────────────────
type FilterTab = 'All Messages' | 'Unread' | 'Priority';

interface Conversation {
    id: string;
    name: string;
    preview: string;
    time: string;
    avatar: string;
    isOnline: boolean;
    isUnread: boolean;
    isAlerted: boolean;
    alertPreview?: string;
    borderColor?: string;
}

interface ChatMessage {
    id: string;
    senderId: 'me' | 'them';
    text: string;
    time: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const CONVERSATIONS: Conversation[] = [
    {
        id: '1', name: 'Ethan Caldwell',
        preview: 'Hey, can we talk about the midt...',
        time: '2m ago', avatar: 'https://i.pravatar.cc/64?u=ethan_caldwell_c',
        isOnline: true, isUnread: true, isAlerted: false,
        borderColor: AURORA.blue,
    },
    {
        id: '2', name: 'Maya Rodriguez',
        preview: 'Thanks for the resources you sent ove...',
        time: '1h ago', avatar: 'https://i.pravatar.cc/64?u=maya_rodriguez_c',
        isOnline: false, isUnread: false, isAlerted: false,
    },
    {
        id: '3', name: 'Liam Vance',
        preview: "Liam's mood check-in triggered ...",
        time: '3h ago', avatar: 'https://i.pravatar.cc/64?u=liam_vance_c',
        isOnline: false, isUnread: true, isAlerted: true,
        borderColor: AURORA.orange,
    },
    {
        id: '4', name: 'Sophie Chen',
        preview: 'Is it possible to reschedule our 3PM s...',
        time: 'Yesterday', avatar: 'https://i.pravatar.cc/64?u=sophie_chen_c',
        isOnline: false, isUnread: false, isAlerted: false,
    },
    {
        id: '5', name: 'Jordan Smith',
        preview: "I've completed the goal-setting exerci...",
        time: 'Oct 24', avatar: 'https://i.pravatar.cc/64?u=jordan_smith_c',
        isOnline: false, isUnread: false, isAlerted: false,
    },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
    '1': [
        { id: '1', senderId: 'them', text: "Hi! Can we talk about the midterm exam? I'm feeling really anxious about it.", time: '2m ago' },
    ],
    '2': [
        { id: '1', senderId: 'them', text: 'Thanks for the resources you sent over! They were really helpful.', time: '1h ago' },
        { id: '2', senderId: 'me', text: 'Glad to hear it! Keep up the great work.', time: '1h ago' },
    ],
    '3': [
        { id: '1', senderId: 'them', text: "I've been feeling really low lately. My mood check-in scores have been dropping.", time: '3h ago' },
    ],
    '4': [
        { id: '1', senderId: 'them', text: 'Is it possible to reschedule our 3PM session tomorrow?', time: 'Yesterday' },
    ],
    '5': [
        { id: '1', senderId: 'them', text: "I've completed the goal-setting exercise you assigned. Here are my notes.", time: 'Oct 24' },
    ],
};

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
                <Image
                    source={{ uri: item.avatar }}
                    style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: AURORA.cardAlt,
                    }}
                />
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
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES[contact.id] || []);

    const sendMessage = () => {
        if (!message.trim()) return;
        setMessages(prev => [...prev, {
            id: String(Date.now()), senderId: 'me',
            text: message.trim(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setMessage('');
    };

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
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
                >
                    {messages.map(msg => {
                        const isMe = msg.senderId === 'me';
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
                                        <Image
                                            source={{ uri: contact.avatar }}
                                            style={{ width: 32, height: 32, borderRadius: 16 }}
                                        />
                                    )}
                                    <View style={{
                                        maxWidth: '78%',
                                        backgroundColor: isMe ? AURORA.blue : AURORA.card,
                                        borderRadius: 16,
                                        borderBottomLeftRadius: isMe ? 16 : 4,
                                        borderBottomRightRadius: isMe ? 4 : 16,
                                        paddingHorizontal: 14, paddingVertical: 10,
                                    }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20 }}>
                                            {msg.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Input Bar */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: AURORA.border, gap: 10,
                    }}>
                        <TouchableOpacity style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: AURORA.card, alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
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
                            style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: AURORA.blue,
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Send size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorMessagesScreen() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<FilterTab>('All Messages');
    const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);

    if (selectedContact) {
        return <ChatView contact={selectedContact} onBack={() => setSelectedContact(null)} />;
    }

    const TABS: FilterTab[] = ['All Messages', 'Unread', 'Priority'];

    const filtered = activeTab === 'All Messages'
        ? CONVERSATIONS
        : activeTab === 'Unread'
            ? CONVERSATIONS.filter(c => c.isUnread)
            : CONVERSATIONS.filter(c => c.isAlerted);

    const unreadCount = CONVERSATIONS.filter(c => c.isUnread).length;

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
                        <Image
                            source={{ uri: user?.avatar_url || `https://i.pravatar.cc/50?u=${user?.id}_msg` }}
                            style={{
                                width: 46, height: 46, borderRadius: 23,
                                backgroundColor: AURORA.card,
                            }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>
                                Messages
                            </Text>
                            <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 1 }}>
                                {unreadCount} Unread Conversation{unreadCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <TouchableOpacity style={{ padding: 6 }}>
                            <Search size={22} color={AURORA.textSec} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 6 }}>
                            <PenSquare size={22} color={AURORA.textSec} />
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
                                        paddingHorizontal: 16, paddingVertical: 5, borderRadius: 30,
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
                    {filtered.length === 0 ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                No conversations.
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
            </SafeAreaView>
        </View>
    );
}
