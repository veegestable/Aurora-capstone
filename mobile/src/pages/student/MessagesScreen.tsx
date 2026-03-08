import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, FlatList, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Settings2, Info, Plus, Send, PenSquare } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_COUNSELORS = [
    {
        id: '1', name: 'Ms. Garcia, RGC',
        preview: 'How are you feeling after our session...',
        time: 'JUST NOW', avatar: 'https://i.pravatar.cc/64?u=garcia_rgc',
        isOnline: true, unreadTime: true,
    },
    {
        id: '2', name: 'Dr. Aris, Counselor',
        preview: "I've reviewed your mood log. Let's tal...",
        time: '2h ago', avatar: 'https://i.pravatar.cc/64?u=aris_counselor',
        isOnline: false, unreadTime: false,
    },
    {
        id: '3', name: 'Ms. Santos, LPT',
        preview: "You're welcome! Keep up the great...",
        time: 'Yesterday', avatar: 'https://i.pravatar.cc/64?u=santos_lpt',
        isOnline: false, unreadTime: false,
    },
    {
        id: '4', name: 'Prof. Reyes, Guidance',
        preview: 'The workshop schedule has been...',
        time: 'Jan 12', avatar: 'https://i.pravatar.cc/64?u=reyes_guidance',
        isOnline: false, unreadTime: false,
    },
];

const MOCK_MESSAGES: Record<string, Array<{ id: string; senderId: string; text: string; time: string }>> = {
    '1': [
        { id: '1', senderId: 'them', text: 'Hello! I noticed you logged a low mood earlier. How have you been feeling today?', time: '10:30 AM' },
        { id: '2', senderId: 'me', text: "I've been feeling a bit overwhelmed with my thesis lately, but I'm trying to stay positive.", time: '10:32 AM' },
        { id: '3', senderId: 'them', text: "It's completely normal to feel that way during thesis season. Let's talk about some strategies to manage that stress. Are you free for a quick call?", time: '10:35 AM' },
    ],
    '2': [
        { id: '1', senderId: 'them', text: "I've reviewed your mood log. Let's talk about it.", time: '8:00 AM' },
    ],
    '3': [
        { id: '1', senderId: 'them', text: "You're welcome! Keep up the great work!", time: 'Yesterday' },
    ],
    '4': [
        { id: '1', senderId: 'them', text: 'The workshop schedule has been updated. Check the resources tab.', time: 'Jan 12' },
    ],
};

type TabType = 'Counselors' | 'Peer Support' | 'Archive';

// ─── Message Contact Row ──────────────────────────────────────────────────────
function ContactRow({ item, onPress }: {
    item: typeof MOCK_COUNSELORS[0];
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 0,
                borderBottomWidth: 1, borderBottomColor: AURORA.border,
            }}
        >
            <View style={{ position: 'relative', marginRight: 12 }}>
                <Image
                    source={{ uri: item.avatar }}
                    style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: AURORA.card }}
                />
                {item.isOnline && (
                    <View style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 13, height: 13, borderRadius: 7,
                        backgroundColor: AURORA.green,
                        borderWidth: 2, borderColor: AURORA.bgMessages,
                    }} />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
                    <Text style={{
                        fontSize: 12, fontWeight: item.unreadTime ? '700' : '400',
                        color: item.unreadTime ? AURORA.blue : AURORA.textSec,
                        letterSpacing: item.unreadTime ? 0.5 : 0,
                    }}>{item.time}</Text>
                </View>
                <Text style={{ color: AURORA.textSec, fontSize: 13 }} numberOfLines={1}>
                    {item.preview}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Direct Message Chat ──────────────────────────────────────────────────────
function DirectMessageView({
    contact, onBack
}: {
    contact: typeof MOCK_COUNSELORS[0];
    onBack: () => void;
}) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState(MOCK_MESSAGES[contact.id] || []);

    const sendMessage = () => {
        if (!message.trim()) return;
        setMessages(prev => [...prev, {
            id: String(Date.now()),
            senderId: 'me',
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
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                }}>
                    <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{contact.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: AURORA.green }} />
                            <Text style={{ color: AURORA.green, fontSize: 12 }}>Online</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{ padding: 4 }}>
                        <Info size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                {/* Privacy Banner */}
                <View style={{
                    backgroundColor: 'rgba(124,58,237,0.15)',
                    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
                    borderRadius: 12, marginHorizontal: 16, marginTop: 12,
                    paddingVertical: 10, paddingHorizontal: 14,
                }}>
                    <Text style={{
                        color: AURORA.purple, fontSize: 11, fontWeight: '700',
                        textAlign: 'center', letterSpacing: 0.8,
                    }}>
                        THIS IS A PRIVATE CONVERSATION WITH YOUR COUNSELOR.
                    </Text>
                </View>

                {/* Date label */}
                <Text style={{
                    color: AURORA.textMuted, fontSize: 12, fontWeight: '600',
                    textAlign: 'center', marginTop: 16, marginBottom: 8, letterSpacing: 0.5,
                }}>TODAY</Text>

                {/* Messages */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map(msg => {
                        const isMe = msg.senderId === 'me';
                        return (
                            <View key={msg.id} style={{ marginBottom: 16 }}>
                                <Text style={{
                                    color: AURORA.textSec, fontSize: 11,
                                    marginBottom: 4,
                                    textAlign: isMe ? 'right' : 'left',
                                    marginHorizontal: 4,
                                }}>
                                    {isMe ? 'You' : contact.name}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                                    {!isMe && (
                                        <Image
                                            source={{ uri: contact.avatar }}
                                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: AURORA.card }}
                                        />
                                    )}
                                    <View style={{
                                        maxWidth: '78%',
                                        backgroundColor: isMe ? AURORA.purple : AURORA.card,
                                        borderRadius: 18,
                                        borderBottomLeftRadius: isMe ? 18 : 4,
                                        borderBottomRightRadius: isMe ? 4 : 18,
                                        paddingHorizontal: 16, paddingVertical: 12,
                                    }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20 }}>
                                            {msg.text}
                                        </Text>
                                    </View>
                                    {isMe && (
                                        <Image
                                            source={{ uri: `https://i.pravatar.cc/34?u=student_me` }}
                                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: AURORA.card }}
                                        />
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {/* Typing indicator */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, marginTop: 4 }}>
                        {[0, 1, 2].map(i => (
                            <View key={i} style={{
                                width: 10, height: 10, borderRadius: 5,
                                backgroundColor: AURORA.textMuted,
                            }} />
                        ))}
                    </View>
                </ScrollView>

                {/* Input Bar */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderTopWidth: 1, borderTopColor: AURORA.border,
                        gap: 10,
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
                                backgroundColor: AURORA.purple,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('Counselors');
    const [selectedContact, setSelectedContact] = useState<typeof MOCK_COUNSELORS[0] | null>(null);

    if (selectedContact) {
        return <DirectMessageView contact={selectedContact} onBack={() => setSelectedContact(null)} />;
    }

    const TABS: TabType[] = ['Counselors', 'Peer Support', 'Archive'];

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────────── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                    <Text style={{ color: AURORA.blue, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                        MSU-IIT CCS
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>Messages</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Search size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Settings2 size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Tabs ────────────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', paddingHorizontal: 20,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                    marginTop: 8,
                }}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={{
                                paddingVertical: 10, marginRight: 20,
                                borderBottomWidth: 2,
                                borderBottomColor: activeTab === tab ? AURORA.blue : 'transparent',
                            }}
                        >
                            <Text style={{
                                color: activeTab === tab ? AURORA.blue : AURORA.textSec,
                                fontSize: 14, fontWeight: activeTab === tab ? '700' : '400',
                            }}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Contact List ─────────────────────────────────────────────── */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'Counselors' && MOCK_COUNSELORS.map(item => (
                        <ContactRow key={item.id} item={item} onPress={() => setSelectedContact(item)} />
                    ))}
                    {activeTab !== 'Counselors' && (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>No conversations yet.</Text>
                        </View>
                    )}
                </ScrollView>

                {/* ── FAB ─────────────────────────────────────────────────────── */}
                <TouchableOpacity style={{
                    position: 'absolute', bottom: 20, right: 20,
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: AURORA.blue,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: AURORA.blue, shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
                }}>
                    <PenSquare size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}
