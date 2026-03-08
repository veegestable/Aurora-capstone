import { Text, View } from 'react-native';

interface EmptyStateProps {
    title: string;
    description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
    return (
        <View className="items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <Text className="text-base font-semibold text-slate-900">{title}</Text>
            <Text className="mt-1 text-center text-sm text-slate-500">
                {description ?? 'No records available right now.'}
            </Text>
        </View>
    );
}
