/**
 * Student Layout - _layout.tsx
 * =============================
 * Route: /(student)
 * Role: STUDENT only
 * 
 * This is the tab navigation layout for student users.
 * Contains: Home, Journal, Messages, Zen (Resources), Profile tabs
 * 
 * Auth: Redirects non-students to appropriate dashboards
 */

import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Home, BookMarked, MessageSquare, Wind, User } from 'lucide-react-native';
import { AURORA } from '../../src/constants/aurora-colors';

export default function StudentLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) return <Redirect href="/login" />;
    if (!loading && user?.role === 'admin') return <Redirect href="/(admin)" />;
    if (!loading && user?.role === 'counselor') return <Redirect href="/(counselor)" />;

    return (
        <>
            <StatusBar style="light" />
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: AURORA.navBg,
                        borderTopWidth: 0.5,
                        borderTopColor: AURORA.border,
                        height: 70,
                        paddingBottom: 10,
                        paddingTop: 8,
                    },
                    tabBarActiveTintColor: AURORA.blue,
                    tabBarInactiveTintColor: AURORA.textMuted,
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '500',
                        marginTop: -2,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="history"
                    options={{
                        title: 'Journal',
                        tabBarIcon: ({ color, size }) => <BookMarked size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: 'Messages',
                        tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="resources"
                    options={{
                        title: 'Zen',
                        tabBarIcon: ({ color, size }) => <Wind size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
