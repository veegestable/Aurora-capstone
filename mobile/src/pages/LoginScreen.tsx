import React from 'react';
import { View, Text, ScrollView, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Brain, Users } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginForm from '../components/auth/LoginForm';

const FEATURES = [
    { icon: Brain, label: 'Mood Tracking', color: '#34D399' },
    { icon: Users, label: 'Counselor Support', color: '#F59E0B' },
    { icon: Heart, label: 'Wellness Tools', color: '#EC4899' },
];

export default function LoginScreen() {
    const isWeb = Platform.OS === 'web';

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <SafeAreaView className="flex-1 bg-primary">
                <Stack.Screen options={{ headerShown: false }} />
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                {/* Header Section */}
                <View className="items-center mb-6 mt-6">
                    <Image
                        source={require('../assets/logo-light.png')}
                        style={{ width: 200, height: 200, marginBottom: 12 }}
                        resizeMode="contain"
                    />
                    <Text className="text-center text-gray-400 text-base max-w-xs">
                        AI-powered mental health platform tailored for your wellness journey
                    </Text>
                </View>

                {/* Feature cards - glassmorphism */}
                <View style={styles.features}>
                    {FEATURES.map((item, index) => (
                        <View key={index} style={styles.featureCard}>
                            {isWeb ? (
                                <View style={[styles.featureGlass, styles.featureFallback]}>
                                    <View style={[styles.featureIcon, { backgroundColor: `${item.color}22` }]}>
                                        <item.icon size={18} color={item.color} />
                                    </View>
                                    <Text style={styles.featureLabel}>{item.label}</Text>
                                </View>
                            ) : (
                                <BlurView intensity={40} tint="dark" style={styles.featureGlass}>
                                    <View style={styles.featureOverlay} />
                                    <View style={[styles.featureIcon, { backgroundColor: `${item.color}22` }]}>
                                        <item.icon size={18} color={item.color} />
                                    </View>
                                    <Text style={styles.featureLabel}>{item.label}</Text>
                                </BlurView>
                            )}
                        </View>
                    ))}
                </View>

                {/* Auth Form */}
                <LoginForm />
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    features: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    featureCard: { flex: 1 },
    featureGlass: {
        alignItems: 'center',
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        position: 'relative',
    },
    featureFallback: { backgroundColor: 'rgba(255,255,255,0.06)' },
    featureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15,23,42,0.3)',
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    featureLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
    },
});
