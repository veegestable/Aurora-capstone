import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, Switch, Alert, Image, Modal, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    X, Camera, Eye, Lock,
    Bell, Video, LogOut, User, ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { useUserDaySettings } from '../../stores/UserDaySettingsContext';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../../components/common/LetterAvatar';
import {
    clearDailyCheckInReminder,
    scheduleDailyCheckInReminder,
    sendTestDailyCheckInNotification,
} from '../../services/push-notifications.service';
import {
    CCS_COLLEGE_DEPARTMENT,
    DEGREE_PROGRAM_OPTIONS,
    formatCounselorStudentSubtitle,
    formatYearLevelForDisplay,
    matchLegacyDepartmentToProgramValue,
} from '../../constants/ccs-student-programs';

// ─── Section Header ───────────────────────────────────────────────────────────
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

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: AURORA.border }}>
            <Text style={{ color: AURORA.textSec, fontSize: 11, marginBottom: 4 }}>{label}</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>{value}</Text>
        </View>
    );
}

// ─── Privacy Row ─────────────────────────────────────────────────────────────
function PrivacyRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: AURORA.border,
            gap: 12,
        }}>
            <View style={{ marginTop: 2 }}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 3 }}>{title}</Text>
                <Text style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 17 }}>{description}</Text>
            </View>
        </View>
    );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
    icon, label, value, onValueChange
}: {
    icon: React.ReactNode; label: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AURORA.border,
        }}>
            <View style={{ marginRight: 12 }}>{icon}</View>
            <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
                thumbColor="#FFFFFF"
            />
        </View>
    );
}


type SexOption = 'male' | 'female';

// ─── Edit Profile Modal (name, sex, avatar) ──────────────────────────────────────
function EditProfileModal({
    visible,
    onClose,
    user,
    onSave,
    onPickAvatar,
}: {
    visible: boolean;
    onClose: () => void;
    user: any;
    onSave: (data: { preferredName: string; sex?: SexOption; program: string; yearLevel: string; studentNumber: string; collegeDepartment: string }) => void;
    onPickAvatar?: (imageUri: string) => Promise<void>;
}) {
    const [name, setName] = useState(user?.preferred_name || user?.full_name || '');
    const [sex, setSex] = useState<SexOption | undefined>(user?.sex);
    const [program, setProgram] = useState('');
    const [yearLevel, setYearLevel] = useState(user?.year_level || '');
    const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [programPickerOpen, setProgramPickerOpen] = useState(false);

    const resolveProgramFromUser = (u: any) =>
        (u?.program && DEGREE_PROGRAM_OPTIONS.some((o) => o.value === u.program) ? u.program : '') ||
        matchLegacyDepartmentToProgramValue(u?.department);

    useEffect(() => {
        if (visible && user) {
            setName(user.preferred_name || user.full_name || '');
            setSex(user.sex ?? undefined);
            setProgram(resolveProgramFromUser(user));
            setYearLevel(user.year_level || '');
            setStudentNumber(user.student_number || '');
        }
    }, [visible, user]);

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library to add a profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri && onPickAvatar) {
            setUploadingAvatar(true);
            try {
                await onPickAvatar(result.assets[0].uri);
            } catch (e) {
                Alert.alert('Upload failed', 'Could not upload profile picture. Please try again.');
            } finally {
                setUploadingAvatar(false);
            }
        }
    };

    const handleSave = () => {
        const yearTrim = yearLevel.trim();
        const studentNumTrim = studentNumber.trim();
        if (!program) {
            Alert.alert('Required field', 'Please select your program from the list.');
            return;
        }
        if (!yearTrim) {
            Alert.alert('Required field', 'Please enter your year level (e.g. 1st Year, 2nd Year).');
            return;
        }
        if (!studentNumTrim) {
            Alert.alert('Required field', 'Please enter your student number.');
            return;
        }
        onSave({
            preferredName: name.trim() || user?.full_name || 'Student',
            sex,
            program,
            yearLevel: yearTrim,
            studentNumber: studentNumTrim,
            collegeDepartment: CCS_COLLEGE_DEPARTMENT,
        });
        onClose();
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
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={{ color: AURORA.blue, fontSize: 15, fontWeight: '700' }}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24 }}>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ position: 'relative' }}>
                                <LetterAvatar
                                    name={user?.preferred_name || user?.full_name || 'Student'}
                                    size={90}
                                    avatarUrl={user?.avatar_url}
                                />
                                <TouchableOpacity
                                    onPress={handlePickAvatar}
                                    disabled={uploadingAvatar}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 32, height: 32, borderRadius: 16,
                                        backgroundColor: AURORA.blue, alignItems: 'center', justifyContent: 'center',
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
                            <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 8 }}>College of Computer Studies • MSU-IIT</Text>
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Name</Text>
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
                                placeholder="Your name"
                                placeholderTextColor={AURORA.textMuted}
                            />
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Program <Text style={{ color: AURORA.red }}>*</Text></Text>
                        <TouchableOpacity
                            onPress={() => setProgramPickerOpen(true)}
                            activeOpacity={0.8}
                            style={{
                                backgroundColor: AURORA.card, borderRadius: 14,
                                flexDirection: 'row', alignItems: 'center',
                                paddingHorizontal: 14, marginBottom: 20,
                                borderWidth: 1, borderColor: AURORA.border,
                                minHeight: 50,
                            }}
                        >
                            <Text style={{
                                flex: 1,
                                color: program ? '#FFFFFF' : AURORA.textMuted,
                                fontSize: 15,
                                paddingVertical: 14,
                            }}>
                                {program || 'Select program'}
                            </Text>
                            <ChevronDown size={18} color={AURORA.textSec} />
                        </TouchableOpacity>

                        <Modal
                            visible={programPickerOpen}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setProgramPickerOpen(false)}
                        >
                            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    activeOpacity={1}
                                    onPress={() => setProgramPickerOpen(false)}
                                />
                                <View style={{
                                    backgroundColor: AURORA.card,
                                    borderTopLeftRadius: 20,
                                    borderTopRightRadius: 20,
                                    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                                    borderWidth: 1,
                                    borderColor: AURORA.border,
                                    maxHeight: '55%',
                                }}>
                                    <Text style={{
                                        color: '#FFFFFF',
                                        fontSize: 16,
                                        fontWeight: '700',
                                        paddingHorizontal: 20,
                                        paddingTop: 16,
                                        paddingBottom: 12,
                                    }}>
                                        Select program
                                    </Text>
                                    <ScrollView keyboardShouldPersistTaps="handled">
                                        {DEGREE_PROGRAM_OPTIONS.map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => {
                                                    setProgram(opt.value);
                                                    setProgramPickerOpen(false);
                                                }}
                                                style={{
                                                    paddingVertical: 16,
                                                    paddingHorizontal: 20,
                                                    borderTopWidth: 1,
                                                    borderTopColor: AURORA.border,
                                                    backgroundColor: program === opt.value ? 'rgba(45,107,255,0.12)' : 'transparent',
                                                }}
                                            >
                                                <Text style={{
                                                    color: program === opt.value ? AURORA.blue : '#FFFFFF',
                                                    fontSize: 15,
                                                    fontWeight: program === opt.value ? '700' : '500',
                                                }}>
                                                    {opt.value}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Year Level <Text style={{ color: AURORA.red }}>*</Text></Text>
                        <View style={{
                            backgroundColor: AURORA.card, borderRadius: 14,
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, marginBottom: 20,
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <TextInput
                                style={{ flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 14 }}
                                value={yearLevel}
                                onChangeText={setYearLevel}
                                placeholder="e.g. 1st Year, 2nd Year"
                                placeholderTextColor={AURORA.textMuted}
                            />
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Student Number <Text style={{ color: AURORA.red }}>*</Text></Text>
                        <View style={{
                            backgroundColor: AURORA.card, borderRadius: 14,
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, marginBottom: 20,
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <TextInput
                                style={{ flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 14 }}
                                value={studentNumber}
                                onChangeText={setStudentNumber}
                                placeholder="e.g. 2021-0001"
                                placeholderTextColor={AURORA.textMuted}
                                keyboardType="default"
                            />
                        </View>

                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Sex</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
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
                                    fontSize: 15,
                                    fontWeight: '600',
                                }}>
                                    Male
                                </Text>
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
                                    fontSize: 15,
                                    fontWeight: '600',
                                }}>
                                    Female
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={{ borderRadius: 18, overflow: 'hidden' }}
                        >
                            <LinearGradient
                                colors={['#4A00E0', '#8E2DE2', '#00C6FF']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ paddingVertical: 18, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Save Changes</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function formatResetHourLabel(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ProfileScreen() {
    const { user, signOut, updateUser, uploadAvatar } = useAuth();
    const { reminderHour, remindersEnabled, setReminderHour, setRemindersEnabled, loading: settingsLoading } = useUserDaySettings();
    const [aiCamera, setAiCamera] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

    const pickerValue = useMemo(() => {
        const d = new Date();
        d.setHours(reminderHour, 0, 0, 0);
        return d;
    }, [reminderHour]);

    const handleSignOut = () => {
        Alert.alert('Logout Account', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => { try { await signOut(); } catch { } }
            }
        ]);
    };

    useEffect(() => {
        if (settingsLoading) return;
        const run = async () => {
            if (!remindersEnabled) {
                await clearDailyCheckInReminder();
                return;
            }
            const ok = await scheduleDailyCheckInReminder(reminderHour);
            if (!ok) {
                Alert.alert(
                    'Notifications disabled',
                    'Please allow notification permission so Aurora can remind you on your phone.'
                );
            }
        };
        void run();
    }, [remindersEnabled, reminderHour, settingsLoading]);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 20, paddingVertical: 14,
                }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Settings</Text>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Avatar + Name ─────────────────────────────────────── */}
                    <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                        <View style={{ position: 'relative', marginBottom: 12 }}>
                            <View style={{ borderWidth: 3, borderColor: AURORA.blue, borderRadius: 43 }}>
                                <LetterAvatar
                                    name={user?.preferred_name || user?.full_name || 'Student'}
                                    size={80}
                                    avatarUrl={user?.avatar_url}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowEditProfile(true)}
                                style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: 28, height: 28, borderRadius: 14,
                                    backgroundColor: AURORA.blue,
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: AURORA.bgDeep,
                                }}
                            >
                                <Camera size={13} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                            {user?.preferred_name || user?.full_name || 'Student'}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 2, textAlign: 'center' }}>
                            {formatCounselorStudentSubtitle({
                                department: user?.department,
                                program: user?.program,
                                year_level: user?.year_level,
                            }) || 'MSU-IIT CCS Student'}
                        </Text>
                    </View>

                    {/* ── Personal Details ─────────────────────────────────── */}
                    <SectionHeader title="PERSONAL DETAILS" />
                    <View style={{
                        backgroundColor: AURORA.card, borderRadius: 16,
                        paddingHorizontal: 16,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <InfoRow label="Full Name" value={user?.full_name || 'Student'} />
                        <InfoRow
                            label="Sex"
                            value={user?.sex ? (user.sex === 'male' ? 'Male' : 'Female') : 'Not set'}
                        />
                        <InfoRow label="Department" value={CCS_COLLEGE_DEPARTMENT} />
                        <InfoRow
                            label="Program"
                            value={user?.program
                                || (user?.department && user.department !== CCS_COLLEGE_DEPARTMENT ? user.department : '')
                                || 'Not set'}
                        />
                        <InfoRow
                            label="Year level"
                            value={user?.year_level ? formatYearLevelForDisplay(user.year_level) : 'Not set'}
                        />
                        <InfoRow label="Student Number" value={user?.student_number || 'Not set'} />
                    </View>

                    {/* ── Privacy Transparency ─────────────────────────────── */}
                    <SectionHeader
                        icon={<Lock size={14} color={AURORA.blue} />}
                        title="PRIVACY TRANSPARENCY"
                    />
                    <View style={{
                        backgroundColor: AURORA.card, borderRadius: 16,
                        paddingHorizontal: 16,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <PrivacyRow
                            icon={<Eye size={18} color={AURORA.green} />}
                            title="What counselors see"
                            description="Aggregated mood trends, crisis alerts, and your scheduled appointments."
                        />
                        <PrivacyRow
                            icon={<Lock size={18} color={AURORA.blue} />}
                            title="What stays private"
                            description="Specific journal entries, AI-analyzed facial micro-expressions, and chat logs."
                        />
                    </View>

                    {/* ── App Preferences ──────────────────────────────────── */}
                    <SectionHeader title="APP PREFERENCES" />
                    <View style={{
                        backgroundColor: AURORA.card, borderRadius: 16,
                        paddingHorizontal: 16,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <ToggleRow
                            icon={<Bell size={18} color={AURORA.textSec} />}
                            label="Daily Check-in Reminders"
                            value={remindersEnabled}
                            onValueChange={(v) => { void setRemindersEnabled(v); }}
                        />
                        <ToggleRow
                            icon={<Video size={18} color={AURORA.textSec} />}
                            label="Camera (Daily Selfie)"
                            value={aiCamera}
                            onValueChange={setAiCamera}
                        />
                        <TouchableOpacity
                            onPress={() => setShowReminderTimePicker(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: AURORA.border,
                            }}
                        >
                            <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>Reminder time</Text>
                            <Text style={{ color: AURORA.blue, fontSize: 14, fontWeight: '700' }}>
                                {formatResetHourLabel(reminderHour)}
                            </Text>
                        </TouchableOpacity>
                        <Text style={{ color: AURORA.textMuted, fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 4 }}>
                            We will remind you to start your day at this time (default 7:00 AM).
                        </Text>
                        <TouchableOpacity
                            onPress={async () => {
                                const ok = await sendTestDailyCheckInNotification();
                                if (!ok) {
                                    Alert.alert(
                                        'Notifications disabled',
                                        'Please allow notification permission to receive the test reminder.'
                                    );
                                    return;
                                }
                                Alert.alert('Test sent', 'A test reminder was sent to your phone.');
                            }}
                            style={{
                                marginTop: 10,
                                marginBottom: 6,
                                paddingVertical: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: 'rgba(45,107,255,0.35)',
                                backgroundColor: 'rgba(45,107,255,0.12)',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.blue, fontSize: 12, fontWeight: '700' }}>Send test notification now</Text>
                        </TouchableOpacity>
                    </View>
                    <Modal visible={showReminderTimePicker} transparent animationType="slide">
                        <TouchableOpacity
                            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
                            activeOpacity={1}
                            onPress={() => setShowReminderTimePicker(false)}
                        >
                            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                                <View
                                    style={{
                                        backgroundColor: AURORA.card,
                                        padding: 16,
                                        borderTopLeftRadius: 16,
                                        borderTopRightRadius: 16,
                                        borderWidth: 1,
                                        borderColor: AURORA.border,
                                    }}
                                >
                                    <DateTimePicker
                                        value={pickerValue}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={async (_e, date) => {
                                            if (Platform.OS === 'android') setShowReminderTimePicker(false);
                                            if (date) await setReminderHour(date.getHours());
                                        }}
                                    />
                                    {Platform.OS === 'ios' ? (
                                        <TouchableOpacity
                                            onPress={() => setShowReminderTimePicker(false)}
                                            style={{
                                                marginTop: 12,
                                                paddingVertical: 14,
                                                borderRadius: 12,
                                                backgroundColor: AURORA.blue,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Done</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Modal>

                    {/* ── Edit Profile Button ───────────────────────────────── */}
                    <TouchableOpacity
                        onPress={() => setShowEditProfile(true)}
                        style={{
                            backgroundColor: 'rgba(45,107,255,0.1)', borderRadius: 16,
                            padding: 16, alignItems: 'center', marginTop: 16,
                            borderWidth: 1, borderColor: 'rgba(45,107,255,0.3)',
                        }}
                    >
                        <Text style={{ color: AURORA.blue, fontSize: 15, fontWeight: '700' }}>Edit Profile</Text>
                    </TouchableOpacity>

                    {/* ── Logout ───────────────────────────────────────────── */}
                    <TouchableOpacity
                        onPress={handleSignOut}
                        style={{
                            backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16,
                            padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            marginTop: 12, gap: 8,
                            borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
                        }}
                    >
                        <LogOut size={18} color={AURORA.red} />
                        <Text style={{ color: AURORA.red, fontSize: 15, fontWeight: '700' }}>Logout Account</Text>
                    </TouchableOpacity>
                </ScrollView>

                <EditProfileModal
                    visible={showEditProfile}
                    onClose={() => setShowEditProfile(false)}
                    user={user}
                    onSave={async (data) => {
                        try {
                            await updateUser({
                                preferred_name: data.preferredName,
                                sex: data.sex,
                                department: data.collegeDepartment,
                                program: data.program,
                                year_level: data.yearLevel,
                                student_number: data.studentNumber,
                            });
                        } catch (e) {
                            console.error('Failed to save profile:', e);
                        }
                    }}
                    onPickAvatar={async (uri) => {
                        await uploadAvatar(uri);
                    }}
                />
            </SafeAreaView>
        </View>
    );
}
