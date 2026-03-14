import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { router } from 'expo-router';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { triggerHaptic } from '../../utils/haptics';

export default function LoginForm() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'student' as 'student' | 'counselor',
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
                const result = await signUp(formData.email, formData.password, formData.fullName, formData.role);
                if (result.success) {
                    Alert.alert('Success', result.message, [{ text: 'OK', onPress: () => setIsSignUp(false) }]);
                    setFormData(prev => ({ ...prev, password: '' }));
                } else {
                    Alert.alert('Registration Failed', result.message);
                }
            } else {
                await signIn(formData.email, formData.password);
                router.replace('/');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const isWeb = Platform.OS === 'web';
    const formContent = (
        <>
            <Text className="text-2xl font-bold text-white text-center mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={{ color: '#E2E8F0' }} className="text-center mb-6 text-base">
                {isSignUp ? 'Join Aurora today' : 'Sign in to continue'}
            </Text>

            <View style={styles.formFields}>
                {isSignUp && (
                    <>
                        <Input
                            variant="glass"
                            label="Full Name"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChangeText={(text) => updateFormData('fullName', text)}
                            autoCapitalize="words"
                        />
                        <View>
                            <Text style={styles.roleLabel}>Sign up as</Text>
                            <View style={styles.roleRow}>
                                <TouchableOpacity
                                    onPress={() => { triggerHaptic('light'); updateFormData('role', 'student'); }}
                                    style={[
                                        styles.roleBtn,
                                        formData.role === 'student' && styles.roleBtnActive,
                                    ]}
                                >
                                    <Text style={[
                                        styles.roleBtnText,
                                        formData.role === 'student' && styles.roleBtnTextActive,
                                    ]}>Student</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { triggerHaptic('light'); updateFormData('role', 'counselor'); }}
                                    style={[
                                        styles.roleBtn,
                                        formData.role === 'counselor' && styles.roleBtnActive,
                                    ]}
                                >
                                    <Text style={[
                                        styles.roleBtnText,
                                        formData.role === 'counselor' && styles.roleBtnTextActive,
                                    ]}>Counselor</Text>
                                </TouchableOpacity>
                            </View>
                            {formData.role === 'counselor' && (
                                <Text className="text-xs text-amber-300 mt-1">Your account will need admin approval before you can access the counselor dashboard.</Text>
                            )}
                        </View>
                    </>
                )}

                <Input
                    variant="glass"
                    label="Email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <View className="relative">
                    <Input
                        variant="glass"
                        label="Password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(text) => updateFormData('password', text)}
                        secureTextEntry={!isPasswordVisible}
                    />
                    <TouchableOpacity
                        className="absolute right-4 top-10"
                        onPress={() => { triggerHaptic('light'); setIsPasswordVisible(!isPasswordVisible); }}
                    >
                        {isPasswordVisible ? (
                            <EyeOff size={20} color="#CBD5E1" />
                        ) : (
                            <Eye size={20} color="#CBD5E1" />
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
                onPress={() => { triggerHaptic('light'); setIsSignUp(!isSignUp); }}
                className="mt-6 items-center"
            >
                <Text style={{ color: '#93C5FD' }} className="font-medium text-base">
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
            </TouchableOpacity>

            {/* Trust Indicators */}
            <View style={styles.trustSection}>
                {['Secure', 'Private', 'HIPAA Compliant'].map((text, i) => (
                    <View key={i} style={styles.trustItem}>
                        <View style={styles.trustDot} />
                        <Text style={styles.trustText}>{text}</Text>
                    </View>
                ))}
            </View>
        </>
    );

    return (
        <View style={styles.wrapper}>
            {isWeb ? (
                <View style={[styles.glass, styles.glassFallback]}>{formContent}</View>
            ) : (
                <BlurView intensity={60} tint="dark" style={styles.glass}>
                    <View style={styles.glassOverlay} />
                    <View style={styles.glassContent}>{formContent}</View>
                </BlurView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { borderRadius: 24, overflow: 'hidden' },
    glass: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden',
        position: 'relative',
    },
    glassFallback: {
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: 24,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    glassContent: { padding: 24 },
    formFields: { gap: 20 },
    trustSection: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.35)',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trustDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    trustText: {
        fontSize: 12,
        color: '#E2E8F0',
    },
    roleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    roleRow: { flexDirection: 'row', gap: 12 },
    roleBtn: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    roleBtnActive: {
        borderColor: 'rgba(96, 165, 250, 0.8)',
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
    },
    roleBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#CBD5E1',
    },
    roleBtnTextActive: {
        color: '#93C5FD',
    },
});
