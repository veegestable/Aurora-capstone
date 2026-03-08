import { Text, View } from 'react-native';

interface ResourceCardProps {
    title: string;
    type: 'article' | 'exercise' | 'video' | 'tip';
}

export default function ResourceCard({ title, type }: ResourceCardProps) {
    return (
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-xs uppercase tracking-wide text-slate-500">{type}</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{title}</Text>
        </View>
    );
}
