/**
 * Counselor Students Stack - students/_layout.tsx
 * ===============================================
 * Wraps student list + student detail screens in a Stack.
 * Keeps nested routes (profile, messages, notes) out of the main tab bar.
 */

import { Stack } from 'expo-router';

export default function StudentsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
