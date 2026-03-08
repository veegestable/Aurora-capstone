import { ActivityIndicator, View } from 'react-native';

export function LoadingSpinner() {
    return (
        <View className="items-center justify-center py-4">
            <ActivityIndicator size="small" color="#34D399" />
        </View>
    );
}
