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
import { triggerHaptic } from '../../src/utils/haptics';
import { AnimatedTabBarButton } from '../../src/components/navigation/AnimatedTabBarButton';

export default function StudentLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) return <Redirect href="/login" />;
    if (!loading && user?.role === 'admin') return <Redirect href="/(admin)" />;
    if (!loading && user?.role === 'counselor') return <Redirect href="/(counselor)" />;

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
                    tabBarIconStyle: {
                        marginBottom: 0,
                    },
                    tabBarItemStyle: {
                        paddingVertical: 4,
                    },
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
                    name="history"
                    options={{
                        title: 'Journal',
                        tabBarIcon: ({ color, size, focused }) => (
                            <BookMarked size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="history" />
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
                    name="resources"
                    options={{
                        title: 'Zen',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Wind size={focused ? 24 : 22} color={color} />
                        ),
                        tabBarButton: (props) => (
                            <AnimatedTabBarButton {...(props as object)} routeName="resources" />
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
            </Tabs>
        </>
    );
}
