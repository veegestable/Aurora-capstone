import { View, SafeAreaView } from 'react-native';
import ScheduleManager from '../../components/ScheduleManager';

export default function SchedulePage() {
    return (
        <View className="flex-1 bg-white p-4">
            <ScheduleManager />
        </View>
    );
}
