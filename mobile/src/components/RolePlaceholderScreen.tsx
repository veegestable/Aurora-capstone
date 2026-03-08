import { View, Text } from 'react-native';

interface RolePlaceholderScreenProps {
    title: string;
    description?: string;
}

export default function RolePlaceholderScreen({ title, description }: RolePlaceholderScreenProps) {
    return (
        <View className="flex-1 items-center justify-center bg-white px-6">
            <Text className="text-xl font-semibold text-gray-900">{title}</Text>
            <Text className="mt-2 text-center text-gray-500">
                {description ?? 'This screen is scaffolded and ready for your feature implementation.'}
            </Text>
        </View>
    );
}
