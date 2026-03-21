/**
 * Counselor Profile & Settings - profile.tsx
 * =============================================
 * Route: /(counselor)/profile
 * Shows counselor profile, stats, settings and sign out.
 * Editable: name and profile picture only.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Switch, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, MoreVertical, Pencil, User, Lock,
    Bell, Moon, Shield, LogOut, ChevronRight,
    TrendingUp, Star, ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '../../src/stores/AuthContext';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import { firestoreService } from '../../src/services/firebase-firestore.service';

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
    return (
        <Text style={{
            color: AURORA.textMuted, fontSize: 11,
            fontWeight: '700', letterSpacing: 1.5,
            marginTop: 28, marginBottom: 8,
        }}>
            {text}
        </Text>
    );
}

function SettingsRow({
    icon, label, onPress, rightElement,
}: {
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.75 : 1}
            style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 16, paddingHorizontal: 16,
                borderBottomWidth: 1, borderBottomColor: AURORA.border,
            }}
        >
            <View style={{ width: 34, alignItems: 'center', marginRight: 14 }}>
                {icon}
            </View>
            <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>
                {label}
            </Text>
            {rightElement || (
                onPress ? <ChevronRight size={18} color={AURORA.textMuted} /> : null
            )}
        </TouchableOpacity>
    );
}

interface StatCardProps {
    label: string;
    value: string;
    sub: string;
    subColor: string;
    isTop?: boolean;
}

function StatCard({ label, value, sub, subColor, isTop }: StatCardProps) {
    return (
        <View style={{
            flex: 1, backgroundColor: AURORA.card, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: AURORA.border, alignItems: 'flex-start',
        }}>
            <Text style={{
                color: AURORA.textMuted, fontSize: 10,
                fontWeight: '700', letterSpacing: 1.2, marginBottom: 6,
            }}>
                {label}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
                {value}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {isTop ? (
                    <Star size={11} color={subColor} fill={subColor} />
                ) : (
                    <TrendingUp size={11} color={subColor} />
                )}
                <Text style={{ color: subColor, fontSize: 11, fontWeight: '600' }}>
                    {sub}
                </Text>
            </View>
        </View>
    );
}

// ─── Edit Profile Modal (name + avatar only) ────────────────────────────────────
function EditProfileModal({
    visible,
    onClose,
    displayName,
    avatarUrl,
    onSave,
    onPickAvatar,
}: {
    visible: boolean;
    onClose: () => void;
    displayName: string;
    avatarUrl?: string | null;
    onSave: (name: string) => Promise<void>;
    onPickAvatar: (imageUri: string) => Promise<void>;
}) {
    const [name, setName] = useState(displayName);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (visible) setName(displayName);
    }, [visible, displayName]);

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library to change your profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            setUploadingAvatar(true);
            try {
                await onPickAvatar(result.assets[0].uri);
            } catch {
                Alert.alert('Upload failed', 'Could not upload profile picture. Please try again.');
            } finally {
                setUploadingAvatar(false);
            }
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave(name.trim());
            onClose();
        } catch {
            Alert.alert('Error', 'Could not save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 14,
                        borderBottomWidth: 1, borderBottomColor: AURORA.border,
                    }}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ color: AURORA.textSec, fontSize: 15 }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            <Text style={{ color: saving ? AURORA.textMuted : AURORA.blue, fontSize: 15, fontWeight: '700' }}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24 }}>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ position: 'relative', borderWidth: 3, borderColor: AURORA.blue, borderRadius: 53 }}>
                                <LetterAvatar name={name || displayName} size={100} avatarUrl={avatarUrl} />
                                <TouchableOpacity
                                    onPress={handlePickAvatar}
                                    disabled={uploadingAvatar}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 36, height: 36, borderRadius: 18,
                                        backgroundColor: AURORA.blue,
                                        alignItems: 'center', justifyContent: 'center',
                                        borderWidth: 2, borderColor: AURORA.bgDeep,
                                    }}
                                >
                                    {uploadingAvatar ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Pencil size={16} color="#FFFFFF" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Full Name</Text>
                        <TextInput
                            style={{
                                backgroundColor: AURORA.card, borderRadius: 14,
                                color: '#FFFFFF', fontSize: 15, paddingHorizontal: 16, paddingVertical: 14,
                                borderWidth: 1, borderColor: AURORA.border,
                            }}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your full name"
                            placeholderTextColor={AURORA.textMuted}
                        />

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{
                                backgroundColor: AURORA.blue, borderRadius: 18,
                                paddingVertical: 16, alignItems: 'center', marginTop: 28,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorProfileScreen() {
    const { user, signOut, updateUser, uploadAvatar } = useAuth();
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [studentCount, setStudentCount] = useState('120+');

    useEffect(() => {
        firestoreService.getUsersByRole('student')
            .then(students => {
                if (students.length > 0) {
                    setStudentCount(`${students.length}+`);
                }
            })
            .catch(() => {});
    }, []);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    try { await signOut(); } catch { }
                },
            },
        ]);
    };

    // Derive display name and title from user data
    const displayName = user?.full_name || 'Counselor';
    const counselorId = 'MSU-IIT ID: 2015-0482';
    const counselorTitle = user?.department || 'Lead Guidance Counselor | Trauma Specialist';
    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                }}>
                    <TouchableOpacity style={{ padding: 4 }}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={{
                        flex: 1, color: '#FFFFFF', fontSize: 17,
                        fontWeight: '700', textAlign: 'center',
                    }}>
                        Profile & Settings
                    </Text>
                    <TouchableOpacity style={{ padding: 4 }}>
                        <MoreVertical size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* ── Avatar & Name ─────────────────────────────────── */}
                    <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 20 }}>
                        <View style={{ position: 'relative', marginBottom: 16 }}>
                            <View style={{ borderWidth: 3, borderColor: AURORA.blue, borderRadius: 58 }}>
                                <LetterAvatar name={displayName} size={110} avatarUrl={user?.avatar_url} />
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowEditProfile(true)}
                                style={{
                                    position: 'absolute', bottom: 2, right: 2,
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: AURORA.blue,
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2.5, borderColor: AURORA.bgDeep,
                                }}
                            >
                                <Pencil size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
                            {displayName}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 6 }}>
                            {counselorId}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 }}>
                            {counselorTitle}
                        </Text>
                    </View>

                    {/* ── Stats Row ─────────────────────────────────────── */}
                    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 4 }}>
                        <StatCard
                            label="STUDENTS"
                            value={studentCount}
                            sub="+5%"
                            subColor={AURORA.green}
                        />
                        <StatCard
                            label="SESSIONS"
                            value="1.2k"
                            sub="+12%"
                            subColor={AURORA.green}
                        />
                        <StatCard
                            label="RATING"
                            value="4.9"
                            sub="Top 1%"
                            subColor={AURORA.amber}
                            isTop
                        />
                    </View>

                    {/* ── Account Settings ──────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <SectionLabel text="ACCOUNT SETTINGS" />
                    </View>
                    <View style={{
                        backgroundColor: AURORA.card, marginHorizontal: 20,
                        borderRadius: 16, borderWidth: 1, borderColor: AURORA.border,
                        overflow: 'hidden',
                    }}>
                        <SettingsRow
                            icon={<User size={18} color={AURORA.textSec} />}
                            label="Personal Information"
                            onPress={() => { }}
                        />
                        <SettingsRow
                            icon={<Lock size={18} color={AURORA.textSec} />}
                            label="Security & Password"
                            onPress={() => { }}
                        />
                    </View>

                    {/* ── App Preferences ───────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <SectionLabel text="APP PREFERENCES" />
                    </View>
                    <View style={{
                        backgroundColor: AURORA.card, marginHorizontal: 20,
                        borderRadius: 16, borderWidth: 1, borderColor: AURORA.border,
                        overflow: 'hidden',
                    }}>
                        <SettingsRow
                            icon={<Bell size={18} color={AURORA.textSec} />}
                            label="Push Notifications"
                            rightElement={
                                <Switch
                                    value={pushNotifications}
                                    onValueChange={setPushNotifications}
                                    trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
                                    thumbColor="#FFFFFF"
                                />
                            }
                        />
                        <SettingsRow
                            icon={<Moon size={18} color={AURORA.textSec} />}
                            label="Dark Mode"
                            rightElement={
                                <Switch
                                    value={darkMode}
                                    onValueChange={setDarkMode}
                                    trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
                                    thumbColor="#FFFFFF"
                                />
                            }
                        />
                    </View>

                    {/* ── Privacy & Data ─────────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <SectionLabel text="PRIVACY & DATA" />
                    </View>
                    <View style={{
                        backgroundColor: AURORA.card, marginHorizontal: 20,
                        borderRadius: 16, borderWidth: 1, borderColor: AURORA.border,
                        padding: 16,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                            <Shield size={22} color={AURORA.blue} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>
                                    Student Data Access
                                </Text>
                                <Text style={{
                                    color: AURORA.textSec, fontSize: 13, lineHeight: 19,
                                    marginBottom: 14,
                                }}>
                                    Your access to student data is governed by the MSU-IIT Privacy Policy. You can view academic records and wellness logs only for assigned students. All session notes are encrypted and stored securely.
                                </Text>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ color: AURORA.blue, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                                        READ FULL POLICY
                                    </Text>
                                    <ExternalLink size={13} color={AURORA.blue} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* ── Sign Out ───────────────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
                        <TouchableOpacity
                            onPress={handleSignOut}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: AURORA.blue, borderRadius: 18,
                                paddingVertical: 18, flexDirection: 'row',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                                shadowColor: AURORA.blue,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
                            }}
                        >
                            <LogOut size={20} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
                                Sign Out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <EditProfileModal
                    visible={showEditProfile}
                    onClose={() => setShowEditProfile(false)}
                    displayName={displayName}
                    avatarUrl={user?.avatar_url}
                    onSave={async (name) => {
                        await updateUser({ full_name: name });
                    }}
                    onPickAvatar={async (uri) => {
                        await uploadAvatar(uri);
                    }}
                />
            </SafeAreaView>
        </View>
    );
}
