/**
 * Admin Audit Logs Screen - audit-logs.tsx
 * =========================================
 * Route: /(admin)/audit-logs
 * Role: ADMIN
 * 
 * System audit trail for security and compliance.
 * Tracks sensitive role-based actions and data access.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { AURORA } from '../../src/constants/aurora-colors';
import { auditLogsService } from '../../src/services/audit-logs.service';
import type { AuditEntry } from '../../src/types/audit.types';
import AuditLogItem from '../../src/components/admin/AuditLogItem';

export default function AdminAuditLogsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const result = await auditLogsService.list(50);
                if (!cancelled) setLogs(result);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? 'Failed to load audit logs');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    {router.canGoBack() ? (
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
                            <ArrowLeft size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 34 }} />
                    )}
                    <Text style={styles.title}>Audit Logs</Text>
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={AURORA.blue} />
                    </View>
                ) : error ? (
                    <View style={{ padding: 20 }}>
                        <Text style={{ color: AURORA.red }}>{error}</Text>
                    </View>
                ) : logs.length === 0 ? (
                    <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: AURORA.textSec }}>No audit logs yet.</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                        {logs.map((l) => (
                            <AuditLogItem key={l.id} entry={l} />
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
