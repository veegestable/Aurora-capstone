import { Text, View } from 'react-native';

interface StreakCounterProps {
    days: number;
}

export default function StreakCounter({ days }: StreakCounterProps) {
    return (
        <View className="rounded-2xl bg-emerald-50 p-4">
            <Text className="text-sm text-emerald-700">Current streak</Text>
            <Text className="text-2xl font-bold text-emerald-800">{days} days</Text>
        </View>
    );
}
