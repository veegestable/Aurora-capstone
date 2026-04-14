import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/stores/AuthContext";
import { UserDaySettingsProvider } from "../src/stores/UserDaySettingsContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <UserDaySettingsProvider>
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
