import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Alert, StatusBar, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X, RefreshCw } from 'lucide-react-native';
import { AURORA } from '../constants/aurora-colors';
import { getEmotionLabel } from '../utils/moodColors';

interface DetectedEmotion {
    emotion: string;
    confidence: number;
    color: string;
}

interface EmotionDetectionProps {
    onEmotionDetected: (emotions: DetectedEmotion[]) => void;
    /** Card heading (default: Daily Selfie). */
    title?: string;
    /** Helper copy under heading to explain how mood is inferred. */
    helperText?: string;
    /** Called when user confirms the analyzed mood. */
    onUseAnalyzedMood?: (emotion: DetectedEmotion) => void;
    /** Confirm button label after analysis. */
    saveActionLabel?: string;
    /** Enable success alert for standalone usage. */
    showSaveSuccessAlert?: boolean;
}

const EMOTION_COLORS: Record<string, string> = {
    joy: AURORA.moodHappy,
    happiness: AURORA.moodHappy,
    happy: AURORA.moodHappy,
    surprise: AURORA.moodSurprise,
    surprised: AURORA.moodSurprise,
    anger: AURORA.moodAngry,
    angry: AURORA.moodAngry,
    sadness: AURORA.moodSad,
    sad: AURORA.moodSad,
    neutral: AURORA.moodNeutral,
    fear: '#9333EA',
    fearful: '#9333EA',
    disgust: '#059669',
    disgusted: '#059669',
};

const getEmotionColor = (emotionName: string): string => {
    const normalized = emotionName.toLowerCase().trim();
    return EMOTION_COLORS[normalized] || AURORA.moodNeutral;
};

export function EmotionDetection({
    onEmotionDetected,
    title = 'Daily Selfie',
    helperText,
    onUseAnalyzedMood,
    saveActionLabel,
    showSaveSuccessAlert = true,
}: EmotionDetectionProps) {
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedWithFrontCamera, setCapturedWithFrontCamera] = useState(false);
    const [detectedEmotions, setDetectedEmotions] = useState<DetectedEmotion[]>([]);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('front');
    const cameraRef = useRef<CameraView>(null);
    const [selectedDetectedEmotion, setSelectedDetectedEmotion] = useState<string | null>(null);

    const normalizeEmotionName = (emotion: string): string => {
        const key = emotion.toLowerCase().trim();
        if (key === 'happy' || key === 'happiness') return 'joy';
        if (key === 'sad') return 'sadness';
        if (key === 'angry') return 'anger';
        if (key === 'surprised') return 'surprise';
        return key;
    };

    const startCamera = async () => {
        try {
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert('Permission needed', 'Camera permission is required to take photos');
                    return;
                }
            }
            setIsCameraVisible(true);
        } catch (error) {
            console.warn('Camera start failed (likely emulator issue):', error);
            Alert.alert('Camera Error', 'Could not start camera. Try uploading a photo instead.');
        }
    };

    const closeCamera = () => {
        setIsCameraVisible(false);
        if (Platform.OS === 'android') {
            // Small delay to ensure Modal animation doesn't conflict with StatusBar update
            setTimeout(() => {
                StatusBar.setHidden(false);
                StatusBar.setTranslucent(true);
                StatusBar.setBackgroundColor('transparent');
                StatusBar.setBarStyle('light-content');
            }, 100);
        }
    };

    const uploadPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4], // Portrait aspect ratio for selfies
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            setCapturedWithFrontCamera(false);
            setCapturedImage(result.assets[0].uri);
            analyzeEmotion(result.assets[0].uri);
        }
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
            });
            if (photo?.uri) {
                setCapturedWithFrontCamera(facing === 'front');
                setCapturedImage(photo.uri);
                closeCamera();
                analyzeEmotion(photo.uri);
            }
        }
    };

    // AI Emotion Analysis
    const getEmotionAnalysis = async (imageUri: string): Promise<DetectedEmotion[]> => {
        const API_URL = process.env.EXPO_PUBLIC_EMOTION_API_URL;

        if (!API_URL) {
            throw new Error('API URL is not configured');
        }

        try {
            console.log('Sending request to:', `${API_URL}/api/emotion/analyze-upload`);

            const formData = new FormData();
            formData.append('file', {
                uri: imageUri,
                name: 'photo.jpg',
                type: 'image/jpeg',
            } as any);

            const response = await fetch(`${API_URL}/api/emotion/analyze-upload`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Error: ${response.status} - ${text}`);
            }

            const result = await response.json();
            console.log('API Response:', result);

            if (!result.success || !result.face_detected) {
                if (!result.face_detected) throw new Error('No face detected in the image.');
                throw new Error(result.error || 'Unknown API error');
            }

            // Parse response format: { emotions: { 'happiness': 98.5, 'neutral': 1.5, ... } }
            let predictions: DetectedEmotion[] = [];

            if (result.emotions) {
                predictions = Object.entries(result.emotions).map(([emotion, score]) => ({
                    emotion: emotion.toLowerCase(),
                    confidence: (score as number) / 100, // Convert percentage to 0-1
                    color: getEmotionColor(emotion)
                }));
            }

            return predictions
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3);

        } catch (error) {
            console.error('API Detection Failed:', error);
            throw error;
        }
    };

    const analyzeEmotion = async (imageUri: string) => {
        setIsAnalyzing(true);
        try {
            // Check if it's a data URI (old behavior) or file URI
            // if it is a data URI, we might need to assume it won't work with this new API approach easily
            // unless we convert it. But capture/upload now provide URIs.
            const emotions = await getEmotionAnalysis(imageUri);
            const normalized = emotions.map((emotion) => ({
                ...emotion,
                emotion: normalizeEmotionName(emotion.emotion),
            }));
            setDetectedEmotions(normalized);
            setSelectedDetectedEmotion(normalized[0]?.emotion ?? null);
            onEmotionDetected(normalized);
        } catch (error: any) {
            console.error('Emotion analysis failed:', error);
            Alert.alert('Analysis Failed', error.message || 'Could not detect emotions. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AURORA.border }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: AURORA.textPrimary, marginBottom: 16 }}>{title}</Text>
            {helperText ? (
                <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: -8, marginBottom: 14, lineHeight: 18 }}>
                    {helperText}
                </Text>
            ) : null}

            {!capturedImage ? (
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity
                        onPress={startCamera}
                        style={{ flex: 1, backgroundColor: 'rgba(45, 107, 255, 0.15)', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(45, 107, 255, 0.3)' }}
                    >
                        <Camera size={24} color={AURORA.blue} />
                        <Text style={{ color: AURORA.blue, fontWeight: '500', marginTop: 8 }}>Take Selfie</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={uploadPhoto}
                        style={{ flex: 1, backgroundColor: 'rgba(124, 58, 237, 0.15)', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.3)' }}
                    >
                        <Upload size={24} color={AURORA.purple} />
                        <Text style={{ color: AURORA.purple, fontWeight: '500', marginTop: 8 }}>Upload Photo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ alignItems: 'center', width: '100%' }}>
                    <View style={{ position: 'relative', width: '100%', aspectRatio: 3/4, backgroundColor: AURORA.cardAlt, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                        <Image
                            source={{ uri: capturedImage }}
                            style={{
                                width: '100%',
                                height: '100%',
                                transform: capturedWithFrontCamera ? [{ scaleX: -1 }] : undefined,
                            }}
                            resizeMode="cover"
                        />
                        {isAnalyzing && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '500' }}>Analyzing...</Text>
                            </View>
                        )}
                    </View>

                    {detectedEmotions.length > 0 && (
                        <View style={{ width: '100%', marginBottom: 16 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 12, color: AURORA.textPrimary }}>Detected Expressions:</Text>
                            {detectedEmotions.map((emotion, index) => {
                                const emotionColor = emotion.color || getEmotionColor(emotion.emotion);
                                const isSelected = selectedDetectedEmotion === emotion.emotion;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => setSelectedDetectedEmotion(emotion.emotion)}
                                        activeOpacity={0.8}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginBottom: 12,
                                            borderRadius: 10,
                                            borderWidth: isSelected ? 1 : 0,
                                            borderColor: `${emotionColor}88`,
                                            backgroundColor: isSelected ? `${emotionColor}22` : 'transparent',
                                            paddingHorizontal: 8,
                                            paddingVertical: 6,
                                        }}
                                    >
                                        <View style={{ backgroundColor: emotionColor, width: 16, height: 16, borderRadius: 8, marginRight: 10 }} />
                                        <Text style={{ flex: 1, color: emotionColor, fontWeight: '600' }}>{getEmotionLabel(emotion.emotion)}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1.2 }}>
                                            <View style={{ flex: 1, height: 8, backgroundColor: AURORA.cardAlt, borderRadius: 4, marginRight: 10 }}>
                                                <View style={{ height: '100%', backgroundColor: emotionColor, borderRadius: 4, width: `${emotion.confidence * 100}%` }} />
                                            </View>
                                            <View style={{ backgroundColor: `${emotionColor}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, minWidth: 45, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: emotionColor, fontWeight: '600' }}>{Math.round(emotion.confidence * 100)}%</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                        <TouchableOpacity
                            onPress={() => {
                                setCapturedImage(null);
                                setDetectedEmotions([]);
                                setSelectedDetectedEmotion(null);
                                setCapturedWithFrontCamera(false);
                            }}
                            style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: AURORA.border, backgroundColor: AURORA.cardAlt }}
                        >
                            <Text style={{ color: AURORA.textSec, fontWeight: '600' }}>Take Another</Text>
                        </TouchableOpacity>
                        {detectedEmotions.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    const selected =
                                        detectedEmotions.find((emotion) => emotion.emotion === selectedDetectedEmotion) ||
                                        detectedEmotions[0];
                                    onUseAnalyzedMood?.(selected);
                                    if (showSaveSuccessAlert !== false) {
                                        Alert.alert('Success', 'Emotions captured!');
                                    }
                                    setCapturedImage(null);
                                    setDetectedEmotions([]);
                                    setSelectedDetectedEmotion(null);
                                }}
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: AURORA.green }}
                            >
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '600' }}>{saveActionLabel || 'Save'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <Modal visible={isCameraVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    {permission?.granted ? (
                        <View style={{ flex: 1 }}>
                            <CameraView
                                ref={cameraRef}
                                style={{ flex: 1 }}
                                facing={facing}
                            />
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', paddingBottom: 40 }} pointerEvents="box-none">
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32 }}>
                                    <TouchableOpacity
                                        onPress={closeCamera}
                                        style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999 }}
                                    >
                                        <X size={24} color="white" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={capturePhoto}
                                        style={{ width: 80, height: 80, backgroundColor: 'white', borderRadius: 40, borderWidth: 4, borderColor: AURORA.textSec }}
                                    />

                                    <TouchableOpacity
                                        onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                                        style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999 }}
                                    >
                                        <RefreshCw size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: AURORA.bg }}>
                            <Text style={{ color: AURORA.textPrimary, marginBottom: 16 }}>Camera permission is required</Text>
                            <TouchableOpacity
                                onPress={requestPermission}
                                style={{ paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, backgroundColor: AURORA.blue }}
                            >
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '600' }}>Grant Permission</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={closeCamera}
                                style={{ marginTop: 32, padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999 }}
                            >
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}
