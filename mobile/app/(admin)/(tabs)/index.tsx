/**
 * Admin Dashboard - Route: /(admin)
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { AURORA } from '../../../src/constants/aurora-colors';
import { AnnouncementSection } from '../../../src/components/announcements/AnnouncementSection';
import { ADMIN_TAB_BAR_BOTTOM_CLEARANCE } from '../../../constants/admin-tab-bar';

export default function AdminDashboardScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 32 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE }}
            >
                <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 24 }}>Admin Dashboard</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(admin)/counselors')}
                    style={{
                        backgroundColor: AURORA.card,
                        borderRadius: 14,
                        padding: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                    }}
                >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(45,107,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} color={AURORA.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Counselors</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 2 }}>Review and approve counselor signups</Text>
                    </View>
                </TouchableOpacity>

                <AnnouncementSection role="counselor" showAddButton />
            </ScrollView>
        </SafeAreaView>
    );
}
