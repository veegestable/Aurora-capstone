import "../global.css";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import * as Notifications from 'expo-notifications';
import { AuthProvider } from "../src/stores/AuthContext";
import { UserDaySettingsProvider } from "../src/stores/UserDaySettingsContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureNotificationHandler, sendSessionDeviceNotification } from "../src/services/push-notifications.service";
import { useAuth } from "../src/stores/AuthContext";
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../src/services/firebase";

function NotificationRouterBridge() {
    const router = useRouter();

    useEffect(() => {
        configureNotificationHandler();

        const navigateFromResponse = async (response: Notifications.NotificationResponse | null) => {
            if (!response?.notification?.request?.content?.data) return;
            const data = response.notification.request.content.data as Record<string, unknown>;
            const notificationId = typeof data.notificationId === 'string' ? data.notificationId.trim() : '';
            const targetRouteCamel = typeof data.targetRoute === 'string' ? data.targetRoute.trim() : '';
            const targetRouteSnake = typeof data.target_route === 'string' ? data.target_route.trim() : '';
            const rawRoute = targetRouteCamel || targetRouteSnake;
            const notifType = typeof data.type === 'string' ? data.type : '';
            const fallbackRoute =
                notifType === 'session_invitation' || notifType === 'session_update'
                    ? '/(student)/messages'
                    : '/(student)/index';

            if (notificationId) {
                try {
                    await updateDoc(doc(db, 'notifications', notificationId), {
                        delivered_at: Timestamp.now(),
                        updated_at: Timestamp.now(),
                    });
                } catch {
                    // Best effort telemetry only.
                }
            }
            router.push(rawRoute || fallbackRoute);
        };

        Notifications.getLastNotificationResponseAsync().then((r) => void navigateFromResponse(r)).catch(() => {});
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            void navigateFromResponse(response);
        });
        return () => sub.remove();
    }, [router]);

    return null;
}

function SessionNotificationBridge() {
    const { user } = useAuth();
    const processingIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user?.id) return;

        const q = query(
            collection(db, 'notifications'),
            where('user_id', '==', user.id),
            where('status', '==', 'pending'),
            where('type', '==', 'counselor_message'),
            orderBy('created_at', 'desc')
        );

        const unsub = onSnapshot(q, async (snap) => {
            const additions = snap.docChanges().filter((change) => change.type === 'added');
            for (const change of additions) {
                const notifId = change.doc.id;
                if (processingIdsRef.current.has(notifId)) continue;
                processingIdsRef.current.add(notifId);

                try {
                    const shouldSendSessionPush = user.session_push_notifications_enabled !== false;

                    if (!shouldSendSessionPush) {
                        await updateDoc(doc(db, 'notifications', notifId), {
                            status: 'sent',
                            delivery_mode: 'local_bridge',
                            attempted_at: Timestamp.now(),
                            skipped_by_user_preference: true,
                            updated_at: Timestamp.now(),
                        });
                        continue;
                    }

                    const data = change.doc.data() as Record<string, unknown>;
                    const body = typeof data.message === 'string' ? data.message : 'You have a session update.';
                    const targetRoute =
                        data.target_route === '/(counselor)/messages'
                            ? '/(counselor)/messages'
                            : '/(student)/messages';

                    const ok = await sendSessionDeviceNotification({
                        title: 'Session update',
                        body,
                        targetRoute,
                        notificationId: notifId,
                    });

                    if (ok) {
                        await updateDoc(doc(db, 'notifications', notifId), {
                            status: 'sent',
                            delivery_mode: 'local_bridge',
                            attempted_at: Timestamp.now(),
                            sent_at: Timestamp.now(),
                            updated_at: Timestamp.now(),
                        });
                    }
                } catch {
                    // Keep notification pending; bridge will retry on next launch/snapshot.
                } finally {
                    processingIdsRef.current.delete(notifId);
                }
            }
        });

        return () => {
            unsub();
            processingIdsRef.current.clear();
        };
    }, [user?.id]);

    return null;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <UserDaySettingsProvider>
                    <NotificationRouterBridge />
                    <SessionNotificationBridge />
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
