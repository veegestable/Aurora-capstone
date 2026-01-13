import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

function RootLayoutNav() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        </Stack>
    );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
