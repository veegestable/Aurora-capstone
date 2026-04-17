import "../global.css";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import * as Notifications from 'expo-notifications';
import { AuthProvider } from "../src/stores/AuthContext";
import { UserDaySettingsProvider } from "../src/stores/UserDaySettingsContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureNotificationHandler } from "../src/services/push-notifications.service";

function NotificationRouterBridge() {
    const router = useRouter();

    useEffect(() => {
        configureNotificationHandler();

        const navigateFromResponse = (response: Notifications.NotificationResponse | null) => {
            if (!response?.notification?.request?.content?.data) return;
            const data = response.notification.request.content.data as Record<string, unknown>;
            const targetRouteCamel = typeof data.targetRoute === 'string' ? data.targetRoute.trim() : '';
            const targetRouteSnake = typeof data.target_route === 'string' ? data.target_route.trim() : '';
            const rawRoute = targetRouteCamel || targetRouteSnake;
            const notifType = typeof data.type === 'string' ? data.type : '';
            const fallbackRoute =
                notifType === 'session_invitation' || notifType === 'session_update'
                    ? '/(student)/messages'
                    : '/(student)/index';
            router.push(rawRoute || fallbackRoute);
        };

        Notifications.getLastNotificationResponseAsync().then(navigateFromResponse).catch(() => {});
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            navigateFromResponse(response);
        });
        return () => sub.remove();
    }, [router]);

    return null;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <UserDaySettingsProvider>
                    <NotificationRouterBridge />
                    <Stack>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="pending-counselor" options={{ headerShown: false }} />
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                        <Stack.Screen name="(counselor)" options={{ headerShown: false }} />
                        <Stack.Screen name="(student)" options={{ headerShown: false }} />
                        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
                    </Stack>
                </UserDaySettingsProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
