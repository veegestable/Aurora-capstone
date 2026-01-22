import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Alert, StatusBar, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
// import { Camera, Upload, Scan, X, Check } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './common/Button';

interface DetectedEmotion {
    emotion: string;
    confidence: number;
    color: string;
}

interface EmotionDetectionProps {
    onEmotionDetected: (emotions: DetectedEmotion[]) => void;
}

const EMOTION_COLORS: Record<string, string> = {
    joy: '#FFD700',      // Happy
    surprise: '#FF8C00', // Surprise
    anger: '#DC143C',    // Angry
    sadness: '#4169E1',  // Sad
    neutral: '#808080'   // Neutral
};

export function EmotionDetection({ onEmotionDetected }: EmotionDetectionProps) {
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [detectedEmotions, setDetectedEmotions] = useState<DetectedEmotion[]>([]);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('front');
    const cameraRef = useRef<CameraView>(null);

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
                    color: EMOTION_COLORS[emotion.toLowerCase()] || EMOTION_COLORS.neutral
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
            setDetectedEmotions(emotions);
            onEmotionDetected(emotions);
        } catch (error: any) {
            console.error('Emotion analysis failed:', error);
            Alert.alert('Analysis Failed', error.message || 'Could not detect emotions. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Text className="text-xl font-semibold text-gray-900 mb-4">AI Emotion Detection</Text>

            {!capturedImage ? (
                <View className="flex-row gap-4">
                    <TouchableOpacity
                        onPress={startCamera}
                        className="flex-1 bg-blue-50 p-4 rounded-xl items-center border-2 border-blue-100"
                    >
                        <Ionicons name="camera" size={24} color="#3B82F6" />
                        <Text className="text-blue-600 font-medium mt-2">Take Selfie</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={uploadPhoto}
                        className="flex-1 bg-purple-50 p-4 rounded-xl items-center border-2 border-purple-100"
                    >
                        <Ionicons name="cloud-upload" size={24} color="#8B5CF6" />
                        <Text className="text-purple-600 font-medium mt-2">Upload Photo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="items-center w-full">
                    <View className="relative w-full aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-4">
                        <Image
                            source={{ uri: capturedImage }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                        {isAnalyzing && (
                            <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <Text className="text-white font-medium">Analyzing...</Text>
                            </View>
                        )}
                    </View>

                    {detectedEmotions.length > 0 && (
                        <View className="w-full mb-4">
                            <Text className="font-semibold mb-2">Detected Emotions:</Text>
                            {detectedEmotions.map((emotion, index) => (
                                <View key={index} className="flex-row items-center mb-2">
                                    <View
                                        style={{ backgroundColor: emotion.color }}
                                        className="w-4 h-4 rounded-full mr-2"
                                    />
                                    <Text className="flex-1 capitalize text-gray-700">{emotion.emotion}</Text>
                                    <View className="flex-row items-center flex-1">
                                        <View className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                                            <View
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${emotion.confidence * 100}%` }}
                                            />
                                        </View>
                                        <Text className="text-xs text-gray-500">{Math.round(emotion.confidence * 100)}%</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View className="flex-row gap-2 w-full">
                        <Button
                            onPress={() => {
                                setCapturedImage(null);
                                setDetectedEmotions([]);
                            }}
                            variant="outline"
                            className="flex-1"
                        >
                            Take Another
                        </Button>
                        {detectedEmotions.length > 0 && (
                            <Button
                                onPress={() => {
                                    Alert.alert('Success', 'Emotions captured!');
                                    setCapturedImage(null);
                                    setDetectedEmotions([]);
                                }}
                                className="flex-1 bg-green-500"
                            >
                                Save
                            </Button>
                        )}
                    </View>
                </View>
            )}

            <Modal visible={isCameraVisible} animationType="slide">
                <View className="flex-1 bg-black">
                    {permission?.granted ? (
                        <View style={{ flex: 1 }}>
                            <CameraView
                                ref={cameraRef}
                                style={{ flex: 1 }}
                                facing={facing}
                            />
                            <View className="absolute inset-0 justify-end pb-10 custom-overlay" pointerEvents="box-none">
                                <View className="flex-row justify-center items-center gap-8">
                                    <TouchableOpacity
                                        onPress={closeCamera}
                                        className="p-4 bg-white/20 rounded-full"
                                    >
                                        <Ionicons name="close" size={24} color="white" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={capturePhoto}
                                        className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg"
                                    />

                                    <TouchableOpacity
                                        onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                                        className="p-4 bg-white/20 rounded-full"
                                    >
                                        <Ionicons name="camera-reverse" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-white mb-4">Camera permission is required</Text>
                            <Button onPress={requestPermission} variant="outline" className="bg-white">
                                Grant Permission
                            </Button>
                            <TouchableOpacity
                                onPress={closeCamera}
                                className="mt-8 p-4 bg-white/20 rounded-full"
                            >
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}
