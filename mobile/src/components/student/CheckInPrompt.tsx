import { Text, View } from 'react-native';

export default function CheckInPrompt() {
    return (
        <View className="rounded-2xl bg-sky-50 p-4">
            <Text className="text-sm text-sky-800">How are you feeling today?</Text>
            <Text className="mt-1 text-xs text-sky-700">A quick daily check-in helps track your mood trend.</Text>
        </View>
    );
}
