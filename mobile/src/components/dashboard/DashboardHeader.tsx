import React from 'react';
import { View, Image, Platform, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../stores/AuthContext';

export default function DashboardHeader() {
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    return (
        <SafeAreaView className="bg-primary" style={{ paddingTop: Platform.OS === 'android' ? 30 : 0 }}>
            <View className="px-6 py-4 flex-row items-center justify-between bg-primary border-b border-white/5">
                <Image
                    source={require('../../assets/logotype-light.png')}
                    style={{ width: 120, height: 32 }}
                    resizeMode="contain"
                />
                <View className="flex-row items-center space-x-3">
                    <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
                        <Text className="text-emerald-400 font-semibold text-xs">
                            {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="p-2 bg-white/5 rounded-full active:bg-white/10"
                    >
                        <LogOut size={16} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
