import { View } from 'react-native';
import ScheduleManager from '../../components/ScheduleManager';

export default function ScheduleScreen() {
    return (
        <View className="flex-1 bg-white p-4">
            <ScheduleManager />
        </View>
    );
}
