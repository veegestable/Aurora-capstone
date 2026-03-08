import { Text, View } from 'react-native';

interface BadgeProps {
    label: string;
}

export function Badge({ label }: BadgeProps) {
    return (
        <View className="self-start rounded-full bg-slate-100 px-3 py-1">
            <Text className="text-xs font-medium text-slate-700">{label}</Text>
        </View>
    );
}
