import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { EmotionDetection } from '../../src/components/EmotionDetection';
import { AURORA } from '../../src/constants/aurora-colors';
import { triggerHaptic } from '../../src/utils/haptics';

export const options = { headerShown: false as const };

export default function DailySelfieScreen() {
    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
                    <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('light');
                            router.back();
                        }}
                        style={{ padding: 8, marginRight: 4 }}
                        hitSlop={12}
                    >
                        <ChevronLeft size={24} color={AURORA.textPrimary} />
                    </TouchableOpacity>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 18, fontWeight: '700' }}>Daily Selfie</Text>
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <EmotionDetection onEmotionDetected={() => {}} title="Daily Selfie" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
