import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/stores/AuthContext';

export default function IndexRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-primary">
                <ActivityIndicator size="large" color="#34D399" />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/login" />;
    }

    if (user.role === 'admin') {
        return <Redirect href="/(admin)" />;
    }

    if (user.role === 'counselor') {
        // Counselors need admin approval (pending/rejected = block; approved or legacy undefined = allow)
        const isBlocked = user.approval_status === 'pending' || user.approval_status === 'rejected';
        if (isBlocked) {
            return <Redirect href="/pending-counselor" />;
        }
        return <Redirect href="/(counselor)" />;
    }

    return <Redirect href="/(student)" />;
}
