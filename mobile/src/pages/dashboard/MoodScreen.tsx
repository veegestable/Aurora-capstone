import { View } from 'react-native';
import { MoodCheckIn } from '../../components/MoodCheckIn';

export default function MoodScreen() {
    return (
        <View className="flex-1 bg-white">
            <MoodCheckIn />
        </View>
    );
}
