/**
 * Admin Settings - Route: /(admin)/settings
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '../../../src/stores/AuthContext';
import { AURORA } from '../../../src/constants/aurora-colors';
import { ADMIN_TAB_BAR_BOTTOM_CLEARANCE } from '../../../constants/admin-tab-bar';

export default function AdminSettingsScreen() {
    const { user, signOut } = useAuth();

    const handleLogout = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await signOut();
                    } catch {
                        /* noop */
                    }
                },
            },
        ]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{
                        padding: 20,
                        paddingBottom: 32 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <View
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: 'rgba(45,107,255,0.2)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Shield size={22} color={AURORA.blue} />
                        </View>
                        <View>
                            <Text style={{ color: AURORA.textSec, fontSize: 12, letterSpacing: 1 }}>ADMIN</Text>
                            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Settings</Text>
                        </View>
                    </View>

                    <Text style={{ color: AURORA.textSec, fontSize: 14, marginBottom: 24, lineHeight: 20 }}>
                        Platform preferences and account. More options can be added here later.
                    </Text>

                    <View
                        style={{
                            backgroundColor: AURORA.card,
                            borderRadius: 16,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            marginBottom: 20,
                        }}
                    >
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 4 }}>Signed in as</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                            {user?.full_name ?? 'Admin'}
                        </Text>
                        <Text style={{ color: AURORA.textMuted, fontSize: 14, marginTop: 4 }}>{user?.email}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.85}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            borderRadius: 14,
                            paddingVertical: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                        }}
                    >
                        <LogOut size={20} color={AURORA.red} />
                        <Text style={{ color: AURORA.red, fontSize: 16, fontWeight: '700' }}>Log out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
