/**
 * Admin tab bar — Home, Analytics, Counselors, Settings
 */
import { Tabs } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { Home, BarChart2, Users, Settings } from 'lucide-react-native';
import { AURORA } from '../../../src/constants/aurora-colors';
import { triggerHaptic } from '../../../src/utils/haptics';
import { AnimatedTabBarButton } from '../../../src/components/navigation/AnimatedTabBarButton';
import {
    ADMIN_TAB_BAR_FLOAT_BOTTOM,
    ADMIN_TAB_BAR_HEIGHT,
    ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
} from '../../../constants/admin-tab-bar';

const TAB_BAR_RADIUS = 36;

const adminNavigationTheme = {
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

function AdminTabBarGlass() {
    return (
        <BlurView intensity={58} tint="dark" style={tabBarGlassStyles.blur}>
            <View style={tabBarGlassStyles.tint} />
        </BlurView>
    );
}

export default function AdminTabsLayout() {
    return (
        <ThemeProvider value={adminNavigationTheme}>
            <>
                <StatusBar style="light" />
                <Tabs
                    screenListeners={{
                        tabPress: () => triggerHaptic('light'),
                    }}
                    screenOptions={{
                        headerShown: false,
                        tabBarBackground: () => <AdminTabBarGlass />,
                        sceneStyle: {
                            paddingBottom: ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
                            backgroundColor: AURORA.bg,
                        },
                        tabBarStyle: {
                            position: 'absolute',
                            left: 20,
                            right: 20,
                            bottom: ADMIN_TAB_BAR_FLOAT_BOTTOM,
                            height: ADMIN_TAB_BAR_HEIGHT,
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
                            tabBarIcon: ({ color, focused }) => (
                                <Home size={focused ? 24 : 22} color={color} />
                            ),
                            tabBarButton: (props) => (
                                <AnimatedTabBarButton {...(props as object)} routeName="index" />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="analytics"
                        options={{
                            title: 'Analytics',
                            tabBarIcon: ({ color, focused }) => (
                                <BarChart2 size={focused ? 24 : 22} color={color} />
                            ),
                            tabBarButton: (props) => (
                                <AnimatedTabBarButton {...(props as object)} routeName="analytics" />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="counselors"
                        options={{
                            title: 'Counselors',
                            tabBarIcon: ({ color, focused }) => (
                                <Users size={focused ? 24 : 22} color={color} />
                            ),
                            tabBarButton: (props) => (
                                <AnimatedTabBarButton {...(props as object)} routeName="counselors" />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="settings"
                        options={{
                            title: 'Settings',
                            tabBarIcon: ({ color, focused }) => (
                                <Settings size={focused ? 24 : 22} color={color} />
                            ),
                            tabBarButton: (props) => (
                                <AnimatedTabBarButton {...(props as object)} routeName="settings" />
                            ),
                        }}
                    />
                </Tabs>
            </>
        </ThemeProvider>
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
