/**
 * Admin Layout — Stack: main tab group + secondary screens (students, resources, etc.)
 * Route: /(admin)
 */
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';

export default function AdminLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) {
        return <Redirect href="/login" />;
    }

    if (!loading && user?.role !== 'admin') {
        return <Redirect href="/" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="announcements" />
            <Stack.Screen name="audit-logs" />
            <Stack.Screen name="students" />
            <Stack.Screen name="resources" />
        </Stack>
    );
}
