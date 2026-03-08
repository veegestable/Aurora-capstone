/**
 * Admin Layout - _layout.tsx
 * ===========================
 * Route: /(admin)
 * Role: ADMIN only
 * 
 * Stack navigation layout for admin users.
 * Provides access to school-wide analytics, user management, and settings.
 * 
 * Auth: Redirects non-admins to login or home
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

    return <Stack screenOptions={{ headerShown: false }} />;
}
