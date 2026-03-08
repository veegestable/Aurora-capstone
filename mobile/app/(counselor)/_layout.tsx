/**
 * Counselor Layout - _layout.tsx
 * ================================
 * Route: /(counselor)
 * Role: COUNSELOR only — Tab navigation with 5 tabs
 */

import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Home, Users, AlertTriangle, MessageSquare, User } from 'lucide-react-native';
import { AURORA } from '../../src/constants/aurora-colors';
import { View } from 'react-native';

export default function CounselorLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) return <Redirect href="/login" />;
    if (!loading && user?.role === 'admin') return <Redirect href="/(admin)" />;
    if (!loading && user?.role === 'student') return <Redirect href="/(student)" />;

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
                    name="students"
                    options={{
                        title: 'Students',
                        tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="risk-center"
                    options={{
                        title: 'Risks',
                        tabBarIcon: ({ color, size }) => (
                            <View style={{ position: 'relative' }}>
                                <AlertTriangle size={size} color={color} />
                            </View>
                        ),
                        tabBarBadge: '5',
                        tabBarBadgeStyle: {
                            backgroundColor: AURORA.red,
                            fontSize: 9,
                            minWidth: 16,
                            height: 16,
                            lineHeight: 16,
                        },
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
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                    }}
                />
                {/* Hide non-tab screens from tab bar */}
                <Tabs.Screen name="reminders" options={{ href: null }} />
                <Tabs.Screen name="reports" options={{ href: null }} />
            </Tabs>
        </>
    );
}
