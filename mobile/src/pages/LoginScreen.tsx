import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { Heart, Brain, Users } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginForm from '../components/auth/LoginForm';

export default function LoginScreen() {
    return (
        <SafeAreaView className="flex-1 bg-primary">
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerClassName="flex-grow justify-center p-6 pb-12">
                {/* Header Section */}
                <View className="items-center mb-8 mt-10">
                    <Image className='mb-2'
                        source={require('../assets/logo-light.png')}
                        style={{ width: 120, height: 120, marginBottom: 16 }}
                        resizeMode="contain"
                    />

                    <Text className="text-center text-gray-400 text-base max-w-xs">
                        AI-powered mental health platform tailored for your wellness journey
                    </Text>
                </View>

                {/* Feature Icons */}
                <View className="flex-row justify-between gap-4 mb-8">
                    {[
                        { icon: Brain, label: 'Mood Tracking', color: '#10B981', bg: '#D1FAE5' },
                        { icon: Users, label: 'Counselor Support', color: '#F59E0B', bg: '#FEF3C7' },
                        { icon: Heart, label: 'Wellness Tools', color: '#EC4899', bg: '#FCE7F3' }
                    ].map((item, index) => (
                        <View key={index} className="flex-1 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                            <View style={{ backgroundColor: item.bg }} className="p-2 rounded-full mb-2">
                                <item.icon size={20} color={item.color} />
                            </View>
                            <Text className="text-[10px] sm:text-xs font-medium text-gray-600 text-center">
                                {item.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Auth Form Card */}
                <LoginForm />
            </ScrollView>
        </SafeAreaView>
    );
}
