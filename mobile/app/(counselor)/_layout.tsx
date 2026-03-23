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
import { triggerHaptic } from '../../src/utils/haptics';
import { AnimatedTabBarButton } from '../../src/components/navigation/AnimatedTabBarButton';

export default function CounselorLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) return <Redirect href="/login" />;
    if (!loading && user?.role === 'admin') return <Redirect href="/(admin)" />;
    if (!loading && user?.role === 'student') return <Redirect href="/(student)" />;

    return (
        <>
            <StatusBar style="light" />
            <Tabs
                screenListeners={{
                    tabPress: () => triggerHaptic('light'),
                }}
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: AURORA.navBg,
                        borderTopWidth: 0,
                        height: 80,
                        paddingBottom: 16,
                        paddingTop: 12,
                        paddingHorizontal: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 16,
                    },
                    tabBarActiveTintColor: AURORA.blue,
                    tabBarInactiveTintColor: AURORA.textMuted,
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: '600',
                        marginTop: 4,
                    },
                    tabBarIconStyle: { marginBottom: 0 },
                    tabBarItemStyle: { paddingVertical: 4 },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Home size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="index" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="students"
                    options={{
                        title: 'Students',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Users size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="students" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="risk-center"
                    options={{
                        title: 'Risks',
                        tabBarIcon: ({ color, size, focused }) => (
                            <View style={{ position: 'relative' }}>
                                <AlertTriangle size={focused ? 24 : 22} color={color} />
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
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="risk-center" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: 'Messages',
                        tabBarIcon: ({ color, size, focused }) => (
                            <MessageSquare size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="messages" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size, focused }) => (
                            <User size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="profile" />
                        ),
                    }}
                />
                {/* Hide non-tab screens from tab bar */}
                <Tabs.Screen name="reminders" options={{ href: null }} />
                <Tabs.Screen name="reports" options={{ href: null }} />
                <Tabs.Screen name="session-history" options={{ href: null }} />
            </Tabs>
        </>
    );
}
