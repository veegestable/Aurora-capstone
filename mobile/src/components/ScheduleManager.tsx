import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, FlatList } from 'react-native';
import { Plus, Calendar, Trash2, Edit2, X, Clock } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
import { scheduleService, ScheduleData } from '../services/schedule.service';
import { Card } from './common/Card';
import { Button } from './common/Button';

interface Schedule {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_type: 'exam' | 'deadline' | 'meeting' | 'other';
}

const EVENT_TYPE_STYLES = {
    exam: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    deadline: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
    meeting: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
    other: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' },
};

export default function ScheduleManager() {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [eventType, setEventType] = useState<'exam' | 'deadline' | 'meeting' | 'other'>('other');

    useEffect(() => {
        if (user) {
            loadSchedules();
        }
    }, [user]);

    const loadSchedules = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await scheduleService.getSchedules(user.id);
            setSchedules(data);
        } catch (error) {
            console.error('Failed to load schedules', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!title || !date || !time) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!user) return;

        const eventDate = new Date(`${date}T${time}:00`);
        const formData: ScheduleData = {
            title,
            description,
            event_date: eventDate.toISOString(),
            event_type: eventType,
        };

        try {
            if (editingId) {
                await scheduleService.updateSchedule(editingId, formData);
            } else {
                await scheduleService.createSchedule(user.id, formData);
            }
            await loadSchedules();
            resetForm();
        } catch (error) {
            console.error('Error saving schedule:', error);
            Alert.alert('Error', 'Failed to save event');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Delete Event',
            'Are you sure you want to delete this event?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await scheduleService.deleteSchedule(id);
                        await loadSchedules();
                    }
                }
            ]
        );
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingId(schedule.id);
        setTitle(schedule.title);
        setDescription(schedule.description || '');

        const d = new Date(schedule.event_date);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setEventType(schedule.event_type);
        setShowForm(true);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('09:00');
        setEventType('other');
        setEditingId(null);
        setShowForm(false);
    };

    const upcomingEvents = schedules.filter(
        s => new Date(s.event_date) >= new Date()
    ).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    return (
        <View className="flex-1">
            <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">Upcoming Events</Text>
                <TouchableOpacity
                    onPress={() => setShowForm(true)}
                    className="bg-teal-500 rounded-full w-10 h-10 items-center justify-center shadow-sm"
                >
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={upcomingEvents}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View className="items-center py-10 bg-gray-50 rounded-xl">
                        <Calendar size={48} color="#9CA3AF" />
                        <Text className="text-gray-500 mt-2">No upcoming events</Text>
                        <Button variant="outline" className="mt-4" onPress={() => setShowForm(true)}>Add Event</Button>
                    </View>
                }
                renderItem={({ item }) => {
                    const styles = EVENT_TYPE_STYLES[item.event_type];
                    return (
                        <View className={`mb-3 p-4 rounded-xl border-l-4 ${styles.bg} border-gray-100 border-l-${styles.text.split('-')[1]}-500 shadow-sm`}>
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <View className={`px-2 py-0.5 rounded text-xs ${styles.badge} mr-2`}>
                                            <Text className={`${styles.text} text-xs font-bold uppercase`}>{item.event_type}</Text>
                                        </View>
                                        <Text className="text-gray-500 text-xs flex-row items-center">
                                            {new Date(item.event_date).toLocaleDateString()} • {new Date(item.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text className="text-lg font-semibold text-gray-900">{item.title}</Text>
                                    {item.description && <Text className="text-gray-600 text-sm mt-1">{item.description}</Text>}
                                </View>

                                <View className="flex-row gap-2">
                                    <TouchableOpacity onPress={() => handleEdit(item)} className="p-2 bg-white rounded-full shadow-sm">
                                        <Edit2 size={16} color="#4B5563" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2 bg-white rounded-full shadow-sm">
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                }}
            />

            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white p-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold">{editingId ? 'Edit Event' : 'New Event'}</Text>
                        <TouchableOpacity onPress={resetForm} className="p-2 bg-gray-100 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1">
                        <View className="space-y-4">
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Event title"
                                    className="border border-gray-300 rounded-lg p-3 text-lg"
                                />
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Date (YYYY-MM-DD)</Text>
                                    <TextInput
                                        value={date}
                                        onChangeText={setDate}
                                        placeholder="2024-01-01"
                                        className="border border-gray-300 rounded-lg p-3"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Time (HH:MM)</Text>
                                    <TextInput
                                        value={time}
                                        onChangeText={setTime}
                                        placeholder="09:00"
                                        className="border border-gray-300 rounded-lg p-3"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1">Type</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {['exam', 'deadline', 'meeting', 'other'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            onPress={() => setEventType(type as any)}
                                            className={`px-4 py-2 rounded-lg border ${eventType === type ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-300'}`}
                                        >
                                            <Text className={eventType === type ? 'text-white font-medium capitalize' : 'text-gray-700 capitalize'}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Notes..."
                                    multiline
                                    numberOfLines={3}
                                    className="border border-gray-300 rounded-lg p-3 h-24 text-gray-700"
                                    textAlignVertical="top"
                                />
                            </View>

                            <Button onPress={handleSubmit} className="mt-6 bg-teal-600">
                                {editingId ? 'Update Event' : 'Create Event'}
                            </Button>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
