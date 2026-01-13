import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
// import { Camera, Upload, Scan, X, Check } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './ui/Button';

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

    const uploadPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,

        });

        if (!result.canceled && result.assets[0].base64) {
            const imageData = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setCapturedImage(imageData);
            analyzeEmotion(imageData);
        }
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: true,
            });
            if (photo?.base64) {
                const imageData = `data:image/jpeg;base64,${photo.base64}`;
                setCapturedImage(imageData);
                setIsCameraVisible(false);
                analyzeEmotion(imageData);
            }
        }
    };

    // AI Emotion Analysis
    const getEmotionAnalysis = async (base64Image: string): Promise<DetectedEmotion[]> => {
        const API_URL = process.env.EXPO_PUBLIC_EMOTION_API_URL;

        if (!API_URL) {
            throw new Error('API URL is not configured');
        }

        // Clean base64 string if needed (remove data:image/jpeg;base64, prefix)
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

        try {
            console.log('Sending request to:', `${API_URL}/predict`);

            // Try standard Gradio/HF Space structure first
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: [cleanBase64]
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Error: ${response.status} - ${text}`);
            }

            const result = await response.json();
            console.log('API Response:', result);

            // Parse Gradio response format: { data: [{ label: 'joy', score: 0.9 }, ...] } or similar
            // Adjust parsing based on actual response structure. 
            // Assuming the model returns a list of emotions with scores.

            let predictions: any[] = [];

            // Case 1: Gradio { data: [ { label: 'joy', score: 0.9 }, ... ] } -- usually data[0] is the result
            if (result.data && Array.isArray(result.data)) {
                // Often Gradio returns the output of the function in data array.
                // If the function returns a dictionary of probabilities:
                if (typeof result.data[0] === 'object') {
                    // Normalize format to [ { label, score } ]
                    // If it's a dictionary like { 'joy': 0.9, 'sadness': 0.1 }
                    if (!result.data[0].label) {
                        predictions = Object.entries(result.data[0]).map(([label, score]) => ({
                            label,
                            score: Number(score)
                        }));
                    } else {
                        // Already list of objects?
                        predictions = result.data; // check structure
                    }
                }
            } else if (Array.isArray(result)) {
                // Direct array response
                predictions = result;
            }

            // Map to DetectedEmotion interface
            return predictions.map((p: any) => {
                const emotionName = p.label || p.emotion || 'unknown';
                return {
                    emotion: emotionName.toLowerCase(),
                    confidence: p.score || p.confidence || 0,
                    color: EMOTION_COLORS[emotionName.toLowerCase()] || EMOTION_COLORS.neutral
                };
            })
                // Filter and Sort
                .filter(e => e.confidence > 0.05)
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3);

        } catch (error) {
            console.error('API Detection Failed:', error);
            throw error;
        }
    };

    const analyzeEmotion = async (imageData: string) => {
        setIsAnalyzing(true);
        try {
            const emotions = await getEmotionAnalysis(imageData);
            setDetectedEmotions(emotions);
            onEmotionDetected(emotions);
        } catch (error) {
            console.error('Emotion analysis failed:', error);
            Alert.alert('Analysis Failed', 'Could not detect emotions. Please try again.');
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
                    <View className="relative w-full h-64 rounded-xl overflow-hidden mb-4">
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
                        <CameraView
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            facing={facing}
                        >
                            <View className="flex-1 bg-transparent justify-end pb-10">
                                <View className="flex-row justify-center items-center gap-8">
                                    <TouchableOpacity
                                        onPress={() => setIsCameraVisible(false)}
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
                        </CameraView>
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-white mb-4">Camera permission is required</Text>
                            <Button onPress={requestPermission} variant="outline" className="bg-white">
                                Grant Permission
                            </Button>
                            <TouchableOpacity
                                onPress={() => setIsCameraVisible(false)}
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
