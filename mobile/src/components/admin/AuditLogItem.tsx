import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AURORA } from '../../constants/aurora-colors';
import type { AuditEntry } from '../../types/audit.types';

export default function AuditLogItem({ entry }: { entry: AuditEntry }) {
    const when = entry.createdAt
        ? entry.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.action}>{entry.action || 'action'}</Text>
                {entry.performedByRole ? (
                    <Text style={styles.role}>{entry.performedByRole}</Text>
                ) : null}
            </View>
            <Text style={styles.line}>
                Performed by: <Text style={styles.mono}>{entry.performedBy}</Text>
            </Text>
            <Text style={styles.line}>
                Target: <Text style={styles.mono}>{entry.targetType}</Text> / <Text style={styles.mono}>{entry.targetId}</Text>
            </Text>
            {when ? <Text style={styles.when}>{when}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: AURORA.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    action: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    role: {
        color: AURORA.blue,
        fontSize: 12,
        fontWeight: '700',
    },
    line: {
        color: AURORA.textSec,
        fontSize: 12,
        marginBottom: 6,
        lineHeight: 16,
    },
    mono: {
        color: '#B9C6F5',
        fontSize: 12,
        fontWeight: '600',
    },
    when: {
        color: AURORA.textMuted,
        fontSize: 11,
        marginTop: 8,
    },
});
