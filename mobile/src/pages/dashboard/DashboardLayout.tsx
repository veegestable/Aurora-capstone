import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { SwipeableTabs } from '../../components/navigation/SwipeableTabs';
import { Heart, Calendar, BarChart3, ClipboardList, Settings } from 'lucide-react-native';

// Define options outside to prevent re-creation on every render
const SCREEN_OPTIONS = {
    // Header is rendered explicitly in layout
    tabBarPosition: 'bottom',
    swipeEnabled: true,
    animationEnabled: true,
    tabBarIndicatorStyle: {
        backgroundColor: 'transparent', // Hide standard indicator to mimic bottom tabs
    },
    tabBarStyle: {
        backgroundColor: '#0F172A', // aurora-dark
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        elevation: 0, // Remove shadow on Android
        height: 74,
        paddingBottom: 8,
        paddingTop: 8,
    },
    tabBarActiveTintColor: '#34D399', // aurora-green
    tabBarInactiveTintColor: '#64748B', // aurora-slate
    tabBarShowIcon: true,
    tabBarShowLabel: true,
    tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'none',
    },
    tabBarItemStyle: {
        height: 50,
        padding: 0,
    }
} as const;

export default function DashboardLayout() {
    return (
        <View className="flex-1 bg-aurora-dark">
            <StatusBar style="light" />
            <DashboardHeader />
            <SwipeableTabs
                screenOptions={{
                    ...SCREEN_OPTIONS,
                }}
                style={{ flex: 1 }}
            >
                <SwipeableTabs.Screen
                    name="index"
                    options={{
                        title: 'Mood',
                        tabBarIcon: ({ color }: { color: string }) => <Heart size={24} color={color} />,
                    }}
                />
                <SwipeableTabs.Screen
                    name="calendar"
                    options={{
                        title: 'Calendar',
                        tabBarIcon: ({ color }: { color: string }) => <Calendar size={24} color={color} />,
                    }}
                />
                <SwipeableTabs.Screen
                    name="analytics"
                    options={{
                        title: 'Analytics',
                        tabBarIcon: ({ color }: { color: string }) => <BarChart3 size={24} color={color} />,
                    }}
                />
                <SwipeableTabs.Screen
                    name="schedule"
                    options={{
                        title: 'Schedule',
                        tabBarIcon: ({ color }: { color: string }) => <ClipboardList size={24} color={color} />,
                    }}
                />
                <SwipeableTabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color }: { color: string }) => <Settings size={24} color={color} />,
                    }}
                />
            </SwipeableTabs>
        </View>
    );
}
