import { View } from 'react-native';
import MoodCalendar from '../../components/MoodCalendar';

export default function CalendarScreen() {
    return (
        <View className="flex-1 bg-white p-4">
            <MoodCalendar />
        </View>
    );
}
