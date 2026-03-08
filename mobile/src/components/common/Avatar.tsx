import { Text, View } from 'react-native';

interface AvatarProps {
    name?: string;
}

export function Avatar({ name }: AvatarProps) {
    const initial = name?.trim().charAt(0).toUpperCase() ?? 'A';
    return (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Text className="text-sm font-semibold text-emerald-700">{initial}</Text>
        </View>
    );
}
