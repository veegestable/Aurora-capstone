/**
 * Pending Counselor Screen
 * =======================
 * Shown when a counselor has signed up but has not yet been approved by admin.
 * Admin reviews and approves counselors from the Admin Dashboard.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../src/stores/AuthContext';
import { router } from 'expo-router';
import { Clock, LogOut } from 'lucide-react-native';
import { AURORA } from '../src/constants/aurora-colors';

export default function PendingCounselorScreen() {
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        router.replace('/login');
    };

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
            }}>
                <Clock size={40} color="#F59E0B" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
                Pending Admin Approval
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
                Thank you for signing up as a counselor. Your account is under review. An administrator will approve your access to oversee students soon.
            </Text>
            <Text style={{ color: AURORA.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 40 }}>
                You can sign out and check back later.
            </Text>
            <TouchableOpacity
                onPress={handleSignOut}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    paddingVertical: 14, paddingHorizontal: 24,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
            >
                <LogOut size={18} color={AURORA.red} />
                <Text style={{ color: AURORA.red, fontSize: 16, fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}
