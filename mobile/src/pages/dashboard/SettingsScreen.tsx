import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { AppTextInput as TextInput } from '../../components/common/AppTextInput';
import { useAuth } from '../../stores/AuthContext';
import { User, LogOut } from 'lucide-react-native';
import { Card } from '../../components/common/Card';
import { useUserDaySettings } from '../../stores/UserDaySettingsContext';
import type { ContextCategoryKey } from '../../services/mood-firestore-v2.service';
import { InfoGuideModal, type InfoGuideContent } from '../../components/common/InfoGuideModal';
import { AuroraConfirmModal } from '../../components/common/AuroraConfirmModal';
import { buildFeedback } from '../../utils/aurora-feedback';

export default function SettingsScreen() {
    const { user, updateUser, signOut } = useAuth();
    const {
        academicContextEnabled,
        enabledContextCategories,
        setAcademicContextEnabled,
        setCategoryEnabled,
    } = useUserDaySettings();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);
    const [signOutVisible, setSignOutVisible] = useState(false);
    const [signOutBusy, setSignOutBusy] = useState(false);

    const categoryLabels: Record<ContextCategoryKey, string> = {
        school: 'School',
        health: 'Health',
        social: 'Social',
        fun: 'Fun / Leisure',
        productivity: 'Productivity',
    };

    const handleUpdateProfile = async () => {
        if (!fullName.trim()) {
            setFeedback(buildFeedback('Error', 'Full name cannot be empty', 'error'));
            return;
        }

        try {
            setIsUpdating(true);
            await updateUser({ full_name: fullName });
            setFeedback(buildFeedback('Success', 'Profile updated successfully!', 'success'));
        } catch (error: unknown) {
            setFeedback(
                buildFeedback(
                    'Error',
                    error instanceof Error ? error.message : 'Failed to update user',
                    'error',
                ),
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSignOut = () => {
        setSignOutVisible(true);
    };

    const handleAcademicToggle = async (enabled: boolean) => {
        try {
            setIsSavingPreferences(true);
            await setAcademicContextEnabled(enabled);
        } catch (error: unknown) {
            setFeedback(
                buildFeedback(
                    'Error',
                    error instanceof Error ? error.message : 'Could not update preference',
                    'error',
                ),
            );
        } finally {
            setIsSavingPreferences(false);
        }
    };

    const handleCategoryToggle = async (category: ContextCategoryKey, enabled: boolean) => {
        try {
            setIsSavingPreferences(true);
            await setCategoryEnabled(category, enabled);
        } catch (error: unknown) {
            setFeedback(
                buildFeedback(
                    'Error',
                    error instanceof Error ? error.message : 'Could not update category',
                    'error',
                ),
            );
        } finally {
            setIsSavingPreferences(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50 p-6">
            <View className="mb-8">
                <Text className="text-2xl font-bold text-gray-900">Settings</Text>
                <Text className="text-gray-500">Manage your account preferences</Text>
            </View>

            <View className="space-y-6">
                {/* Profile Section */}
                <Card className="p-5">
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-100 p-2 rounded-full mr-3">
                            <User size={20} color="#2563EB" />
                        </View>
                        <Text className="text-lg font-semibold text-gray-800">Profile Information</Text>
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter your name"
                        />
                    </View>

                    <View className="mb-2">
                        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
                        <TextInput
                            className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-gray-500"
                            value={user?.email}
                            editable={false}
                        />
                        <Text className="text-xs text-gray-400 mt-1 ml-1">Email cannot be changed</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleUpdateProfile}
                        disabled={isUpdating}
                        className={`mt-4 w-full py-3 rounded-xl items-center flex-row justify-center ${isUpdating ? 'bg-blue-400' : 'bg-blue-600'
                            }`}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" className="mr-2" />
                        ) : null}
                        <Text className="text-white font-bold">
                            {isUpdating ? 'Updating...' : 'Update Profile'}
                        </Text>
                    </TouchableOpacity>
                </Card>

                {/* Account Actions */}
                <Card className="p-5">
                    <Text className="text-lg font-semibold text-gray-800 mb-1">Mood Context</Text>
                    <Text className="text-gray-500 mb-4">Customize optional mood-correlation categories</Text>

                    <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3">
                        <View className="pr-3 flex-1">
                            <Text className="text-sm font-semibold text-gray-800">Academic context mode</Text>
                            <Text className="text-xs text-gray-500 mt-1">
                                Enable school activity tags for academic mood analytics.
                            </Text>
                        </View>
                        <Switch value={academicContextEnabled} onValueChange={handleAcademicToggle} disabled={isSavingPreferences} />
                    </View>

                    <Text className="text-xs font-semibold text-gray-500 mb-2">Enabled category packs</Text>
                    {(['school', 'health', 'social', 'fun', 'productivity'] as ContextCategoryKey[]).map((category) => {
                        const enabled = enabledContextCategories.includes(category);
                        return (
                            <View
                                key={category}
                                className="flex-row items-center justify-between border border-gray-200 rounded-xl px-4 py-3 mb-2"
                            >
                                <Text className="text-sm text-gray-800 font-medium">{categoryLabels[category]}</Text>
                                <Switch
                                    value={enabled}
                                    onValueChange={(val) => handleCategoryToggle(category, val)}
                                    disabled={isSavingPreferences || (!academicContextEnabled && category === 'school')}
                                />
                            </View>
                        );
                    })}
                    {!academicContextEnabled && (
                        <Text className="text-xs text-gray-500 mt-2">
                            Academic mode is off. You can still use non-school categories.
                        </Text>
                    )}
                </Card>

                <Card className="p-5">
                    <Text className="text-lg font-semibold text-gray-800 mb-4">Account</Text>

                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="flex-row items-center p-3 bg-red-50 rounded-xl border border-red-100"
                    >
                        <LogOut size={20} color="#EF4444" className="mr-3" />
                        <Text className="text-red-600 font-medium">Sign Out</Text>
                    </TouchableOpacity>
                </Card>

                <View className="items-center mt-8">
                    <Text className="text-gray-400 text-xs">Aurora App v1.0.0</Text>
                </View>
            </View>

            <InfoGuideModal guide={feedback} onClose={() => setFeedback(null)} />

            <AuroraConfirmModal
                visible={signOutVisible}
                title="Sign Out"
                body="Are you sure you want to sign out?"
                cancelLabel="Cancel"
                confirmLabel="Sign Out"
                busy={signOutBusy}
                onCancel={() => {
                    if (!signOutBusy) setSignOutVisible(false);
                }}
                onConfirm={() => {
                    void (async () => {
                        setSignOutBusy(true);
                        try {
                            await signOut();
                            setSignOutVisible(false);
                        } catch (error) {
                            console.error('Sign out error:', error);
                        } finally {
                            setSignOutBusy(false);
                        }
                    })();
                }}
            />
        </View>
    );
}
