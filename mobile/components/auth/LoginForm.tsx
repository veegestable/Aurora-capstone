import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export default function LoginForm() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });

    const updateFormData = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.email || !formData.password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (isSignUp && !formData.fullName) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const result = await signUp(formData.email, formData.password, formData.fullName, 'student');
                if (result.success) {
                    Alert.alert('Success', result.message, [{ text: 'OK', onPress: () => setIsSignUp(false) }]);
                    setFormData(prev => ({ ...prev, password: '' }));
                } else {
                    Alert.alert('Registration Failed', result.message);
                }
            } else {
                await signIn(formData.email, formData.password);
                router.replace('/dashboard');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6">
            <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text className="text-gray-500 text-center mb-6">
                {isSignUp ? 'Join Aurora today' : 'Sign in to continue'}
            </Text>

            <View className="space-y-4">
                {isSignUp && (
                    <Input
                        label="Full Name"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChangeText={(text) => updateFormData('fullName', text)}
                        autoCapitalize="words"
                    />
                )}

                <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <View className="relative">
                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(text) => updateFormData('password', text)}
                        secureTextEntry={!isPasswordVisible}
                    />
                    <TouchableOpacity
                        className="absolute right-4 top-10"
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                        {isPasswordVisible ? (
                            <EyeOff size={20} color="#9CA3AF" />
                        ) : (
                            <Eye size={20} color="#9CA3AF" />
                        )}
                    </TouchableOpacity>
                </View>

                <Button
                    onPress={handleSubmit}
                    loading={loading}
                    className="mt-2"
                >
                    {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
            </View>

            <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                className="mt-6 items-center"
            >
                <Text className="text-blue-600 font-medium">
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
            </TouchableOpacity>

            {/* Trust Indicators */}
            <View className="mt-6 pt-6 border-t border-gray-100 flex-row justify-center space-x-4">
                {['Secure', 'Private', 'HIPAA Compliant'].map((text, i) => (
                    <View key={i} className="flex-row items-center space-x-1">
                        <View className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <Text className="text-xs text-gray-500">{text}</Text>
                    </View>
                ))}
            </View>
        </Card>
    );
}
