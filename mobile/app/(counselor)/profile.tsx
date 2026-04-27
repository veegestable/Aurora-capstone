/**
 * Counselor Profile & Settings - profile.tsx
 * =============================================
 * Route: /(counselor)/profile
 * Shows counselor profile, stats, settings and sign out.
 * Editable: personal details and profile picture via Edit Profile.
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
    ExternalLink, Camera, X,
} from 'lucide-react-native';
import { useAuth } from '../../src/stores/AuthContext';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import { hasNotificationPermission } from '../../src/services/push-notifications.service';

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

function SectionHeader({ icon, title }: { icon?: React.ReactNode; title: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 20 }}>
            {icon}
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }}>
                {title}
            </Text>
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: AURORA.border }}>
            <Text style={{ color: AURORA.textSec, fontSize: 11, marginBottom: 4 }}>{label}</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>{value}</Text>
        </View>
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

type SexOption = 'male' | 'female';

// ─── Edit Profile Modal (full personal details + avatar, like student) ───────────
function EditProfileModal({
    visible,
    onClose,
    user,
    onSave,
    onPickAvatar,
}: {
    visible: boolean;
    onClose: () => void;
    user: { full_name?: string; sex?: 'male' | 'female'; student_number?: string; avatar_url?: string | null } | null;
    onSave: (data: { fullName: string; sex?: SexOption; counselorNumber: string }) => Promise<void>;
    onPickAvatar: (imageUri: string) => Promise<void>;
}) {
    const [name, setName] = useState(user?.full_name || '');
    const [sex, setSex] = useState<SexOption | undefined>(user?.sex);
    const [counselorNumber, setCounselorNumber] = useState(user?.student_number || '');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (visible && user) {
            setName(user.full_name || '');
            setSex(user.sex ?? undefined);
            setCounselorNumber(user.student_number || '');
        }
    }, [visible, user]);

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
        const numTrim = counselorNumber.trim();
        
        if (!numTrim) {
            Alert.alert('Required field', 'Please enter your counselor number.');
            return;
        }
        setSaving(true);
        try {
            await onSave({
                fullName: name.trim() || user?.full_name || 'Counselor',
                sex,
                counselorNumber: numTrim,
            });
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <X size={18} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 15 }}>Cancel</Text>
                            </View>
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
                            <View style={{ position: 'relative' }}>
                                <LetterAvatar
                                    name={name || user?.full_name || 'Counselor'}
                                    size={90}
                                    avatarUrl={user?.avatar_url}
                                />
                                <TouchableOpacity
                                    onPress={handlePickAvatar}
                                    disabled={uploadingAvatar}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 32, height: 32, borderRadius: 16,
                                        backgroundColor: AURORA.blue,
                                        alignItems: 'center', justifyContent: 'center',
                                        borderWidth: 2, borderColor: AURORA.bgDeep,
                                    }}
                                >
                                    {uploadingAvatar ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Camera size={14} color="#FFFFFF" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 8 }}>MSU-IIT</Text>
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Full Name</Text>
                        <View style={{
                            backgroundColor: AURORA.card, borderRadius: 14,
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, marginBottom: 20,
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <User size={16} color={AURORA.textSec} style={{ marginRight: 10 }} />
                            <TextInput
                                style={{ flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 14 }}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your full name"
                                placeholderTextColor={AURORA.textMuted}
                            />
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Sex</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                            <TouchableOpacity
                                onPress={() => setSex('male')}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 14,
                                    borderWidth: 2,
                                    borderColor: sex === 'male' ? AURORA.blue : AURORA.border,
                                    backgroundColor: sex === 'male' ? 'rgba(45,107,255,0.15)' : AURORA.card,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    color: sex === 'male' ? '#FFFFFF' : AURORA.textSec,
                                    fontSize: 15, fontWeight: '600',
                                }}>Male</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSex('female')}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 14,
                                    borderWidth: 2,
                                    borderColor: sex === 'female' ? AURORA.blue : AURORA.border,
                                    backgroundColor: sex === 'female' ? 'rgba(45,107,255,0.15)' : AURORA.card,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    color: sex === 'female' ? '#FFFFFF' : AURORA.textSec,
                                    fontSize: 15, fontWeight: '600',
                                }}>Female</Text>
                            </TouchableOpacity>
                        </View>


                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Counselor Number <Text style={{ color: AURORA.red }}>*</Text></Text>
                        <View style={{
                            backgroundColor: AURORA.card, borderRadius: 14,
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, marginBottom: 24,
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <TextInput
                                style={{ flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 14 }}
                                value={counselorNumber}
                                onChangeText={setCounselorNumber}
                                placeholder="e.g. 2015-0482"
                                placeholderTextColor={AURORA.textMuted}
                                keyboardType="default"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{
                                backgroundColor: AURORA.blue, borderRadius: 18,
                                paddingVertical: 16, alignItems: 'center',
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
    const [savingPushPreference, setSavingPushPreference] = useState(false);
    const [devicePermissionGranted, setDevicePermissionGranted] = useState<boolean | null>(null);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (!user) return;
        setPushNotifications(user.session_push_notifications_enabled !== false);
    }, [user]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const granted = await hasNotificationPermission();
                if (mounted) setDevicePermissionGranted(granted);
            } catch {
                if (mounted) setDevicePermissionGranted(null);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const handleTogglePushNotifications = async (value: boolean) => {
        const previous = pushNotifications;
        setPushNotifications(value);
        setSavingPushPreference(true);
        try {
            await updateUser({ session_push_notifications_enabled: value });
        } catch {
            setPushNotifications(previous);
            Alert.alert('Could not update setting', 'Please try again.');
        } finally {
            setSavingPushPreference(false);
        }
    };

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
    const counselorId = user?.student_number ? `MSU-IIT ID: ${user.student_number}` : 'MSU-IIT';
    const counselorTitle = 'Guidance Counselor';
    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                }}>
                
                    <Text style={{
                        flex: 1, color: '#FFFFFF', fontSize: 17,
                        fontWeight: '700', textAlign: 'center',
                    }}>
                        Profile & Settings
                    </Text>
                   
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

                    {/* ── Personal Details ─────────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <SectionHeader title="PERSONAL DETAILS" />
                    </View>
                    <View style={{
                        backgroundColor: AURORA.card, marginHorizontal: 20,
                        borderRadius: 16, paddingHorizontal: 16,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <InfoRow label="Full Name" value={user?.full_name || 'Counselor'} />
                        <InfoRow
                            label="Sex"
                            value={user?.sex ? (user.sex === 'male' ? 'Male' : 'Female') : 'Not set'}
                        />
                        <InfoRow label="Counselor Number" value={user?.student_number || 'Not set'} />
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
                        {/* <SettingsRow
                            icon={<Lock size={18} color={AURORA.textSec} />}
                            label="Security & Password"
                            onPress={() => { }}
                        /> */}
                        <SettingsRow
                            icon={<User size={18} color={AURORA.textSec} />}
                            label="Edit Profile"
                            onPress={() => setShowEditProfile(true)}
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
                                    onValueChange={handleTogglePushNotifications}
                                    disabled={savingPushPreference}
                                    trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
                                    thumbColor="#FFFFFF"
                                />
                            }
                        />
                        {/* <SettingsRow
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
                        /> */}
                    </View>
                    <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
                        <Text style={{ color: AURORA.textMuted, fontSize: 12, lineHeight: 17 }}>
                            Notifications are best-effort on this app build.
                        </Text>
                        {pushNotifications && devicePermissionGranted === false ? (
                            <Text style={{ color: '#FECACA', fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                                Device notifications are blocked in system settings, so alerts may not appear.
                            </Text>
                        ) : null}
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
                    user={user}
                    onSave={async (data) => {
                        await updateUser({
                            full_name: data.fullName,
                            sex: data.sex,
                            student_number: data.counselorNumber,
                        });
                    }}
                    onPickAvatar={async (uri) => {
                        await uploadAvatar(uri);
                    }}
                />
            </SafeAreaView>
        </View>
    );
}
