import { View } from 'react-native';
import { MoodCheckIn } from '../../components/MoodCheckIn';

export default function MoodPage() {
    return (
        <View className="flex-1 bg-white">
            <MoodCheckIn />
        </View>
    );
}
