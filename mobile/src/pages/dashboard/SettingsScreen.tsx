import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../stores/AuthContext';
import { User, LogOut } from 'lucide-react-native';
import { Card } from '../../components/common/Card';

export default function SettingsScreen() {
    const { user, updateUser, signOut } = useAuth();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateProfile = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name cannot be empty');
            return;
        }

        try {
            setIsUpdating(true);
            await updateUser({ full_name: fullName });
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update user');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (error) {
                            console.error('Sign out error:', error);
                        }
                    }
                }
            ]
        );
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
        </View>
    );
}
