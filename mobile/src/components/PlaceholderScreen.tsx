import { View } from "react-native";
import { AppText as Text } from "./common/AppText";

export default function PlaceholderScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-gray-500">Coming Soon</Text>
    </View>
  );
}
