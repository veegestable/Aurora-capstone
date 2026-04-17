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
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useAuth } from '../../src/stores/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { Home, BookMarked, MessageSquare, Wind, User } from 'lucide-react-native';
import { AURORA } from '../../src/constants/aurora-colors';
import { triggerHaptic } from '../../src/utils/haptics';
import { AnimatedTabBarButton } from '../../src/components/navigation/AnimatedTabBarButton';
import {
    STUDENT_TAB_BAR_FLOAT_BOTTOM,
    STUDENT_TAB_BAR_HEIGHT,
    STUDENT_TAB_BAR_BOTTOM_CLEARANCE,
} from '../../constants/student-tab-bar';
const TAB_BAR_RADIUS = 36;

/** Tab navigator defaults to a light `colors.background` (white); override so padded / underlay areas match Aurora. */
const studentNavigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: AURORA.bg,
        card: AURORA.bg,
        border: AURORA.border as string,
        primary: AURORA.blue,
        text: AURORA.textPrimary,
    },
};

function StudentTabBarGlass() {
    return (
        <BlurView intensity={58} tint="dark" style={tabBarGlassStyles.blur}>
            <View style={tabBarGlassStyles.tint} />
        </BlurView>
    );
}

function StudentTabs() {
    return (
        <Tabs
            screenListeners={{
                tabPress: () => triggerHaptic('light'),
            }}
            screenOptions={{
                headerShown: false,
                tabBarBackground: () => <StudentTabBarGlass />,
                sceneStyle: {
                    paddingBottom: STUDENT_TAB_BAR_BOTTOM_CLEARANCE,
                    backgroundColor: AURORA.bg,
                },
                tabBarStyle: {
                    position: 'absolute',
                    left: 20,
                    right: 20,
                    bottom: STUDENT_TAB_BAR_FLOAT_BOTTOM,
                    height: STUDENT_TAB_BAR_HEIGHT,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingHorizontal: 4,
                    marginHorizontal: 0,
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    borderRadius: TAB_BAR_RADIUS,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.35,
                    shadowRadius: 20,
                    elevation: 20,
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
            <Tabs.Screen
                name="daily-selfie"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const tabBarGlassStyles = StyleSheet.create({
    blur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: TAB_BAR_RADIUS,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    tint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(7, 10, 46, 0.38)',
    },
});

export default function StudentLayout() {
    const { user, loading } = useAuth();

    if (!loading && !user) return <Redirect href="/login" />;
    if (!loading && user?.role === 'admin') return <Redirect href="/(admin)" />;
    if (!loading && user?.role === 'counselor') return <Redirect href="/(counselor)" />;

    return (
        <ThemeProvider value={studentNavigationTheme}>
            <>
                <StatusBar style="light" />
                <StudentTabs />
            </>
        </ThemeProvider>
    );
}
