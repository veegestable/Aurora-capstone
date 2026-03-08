import { View, Text } from 'react-native';

export default function ForgotPasswordScreen() {
    return (
        <View className="flex-1 items-center justify-center bg-white p-6">
            <Text className="text-lg font-semibold text-gray-900">Forgot Password</Text>
            <Text className="mt-2 text-center text-gray-500">
                Password recovery screen will be connected in the auth module.
            </Text>
        </View>
    );
}
