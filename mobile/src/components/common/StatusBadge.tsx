import { Text, View } from 'react-native';

interface StatusBadgeProps {
    status: 'low' | 'medium' | 'high' | 'open' | 'in_progress' | 'resolved';
}

const STATUS_COLOR: Record<StatusBadgeProps['status'], string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-rose-100 text-rose-700',
    open: 'bg-sky-100 text-sky-700',
    in_progress: 'bg-violet-100 text-violet-700',
    resolved: 'bg-slate-100 text-slate-700',
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <View className={`self-start rounded-full px-3 py-1 ${STATUS_COLOR[status].split(' ')[0]}`}>
            <Text className={`text-xs font-medium ${STATUS_COLOR[status].split(' ')[1]}`}>{status}</Text>
        </View>
    );
}
