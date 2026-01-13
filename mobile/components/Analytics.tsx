import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { moodService } from '../services/mood.service';
import { scheduleService } from '../services/schedule.service';
import { BarChart3, TrendingUp, Calendar, Zap, Frown, Sparkles, Lightbulb } from 'lucide-react-native';
import { Card } from './ui/Card';

export default function Analytics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLogs: 0,
        averageEnergy: 0,
        averageStress: 0,
        topEmotion: 'None',
        streak: 0,
    });
    const [insights, setInsights] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            loadAnalytics();
        }
    }, [user]);

    const loadAnalytics = async () => {
        if (!user) return;
        try {
            // Fetch recent mood logs (past 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const moodLogs = await moodService.getMoodLogs(user.id, startDate.toISOString(), endDate.toISOString());

            if (moodLogs && moodLogs.length > 0) {
                // Generate AI Insights
                const generatedInsights = moodService.generateInsights(moodLogs);
                setInsights(generatedInsights);

                // Calculate stats
                const totalLogs = moodLogs.length;
                const totalEnergy = moodLogs.reduce((acc, log) => acc + (log.energy_level || 0), 0);
                const totalStress = moodLogs.reduce((acc, log) => acc + (log.stress_level || 0), 0);

                // Find top emotion
                const emotionCounts: Record<string, number> = {};
                moodLogs.forEach(log => {
                    log.emotions?.forEach(e => {
                        emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
                    });
                });

                let topEmotion = 'None';
                let maxCount = 0;
                Object.entries(emotionCounts).forEach(([emotion, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        topEmotion = emotion;
                    }
                });

                setStats({
                    totalLogs,
                    averageEnergy: Math.round(totalEnergy / totalLogs),
                    averageStress: Math.round(totalStress / totalLogs),
                    topEmotion,
                    streak: calculateStreak(moodLogs),
                });
            }
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStreak = (logs: any[]) => {
        // Simplified streak logic: essentially counting recent consecutive days
        // For a real app, sort by date descending and iterate
        return logs.length > 0 ? logs.length : 0; // MVP placeholder
    };

    return (
        <ScrollView className="flex-1 space-y-4 pb-8">
            {/* AI Insights Card */}
            {insights.length > 0 && (
                <View className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm mb-2">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Sparkles size={20} color="#4F46E5" />
                        <Text className="text-lg font-bold text-indigo-900">AI Mood Insights</Text>
                    </View>
                    <View className="space-y-3">
                        {insights.map((insight, index) => (
                            <View key={index} className="flex-row gap-3 items-start">
                                <Lightbulb size={18} color="#6366F1" className="mt-0.5" />
                                <Text className="flex-1 text-indigo-800 leading-5">
                                    {insight}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View className="flex-row flex-wrap justify-between">
                {/* Streak Card */}
                <View className="w-[48%] bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm mb-4">
                    <TrendingUp size={24} color="#F97316" className="mb-2" />
                    <Text className="text-3xl font-bold text-gray-900">{stats.streak}</Text>
                    <Text className="text-orange-700 font-medium">Day Streak</Text>
                </View>

                {/* Total Logs */}
                <View className="w-[48%] bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm mb-4">
                    <Calendar size={24} color="#3B82F6" className="mb-2" />
                    <Text className="text-3xl font-bold text-gray-900">{stats.totalLogs}</Text>
                    <Text className="text-blue-700 font-medium">Total Check-ins</Text>
                </View>

                {/* Avg Energy */}
                <View className="w-[48%] bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm mb-4">
                    <Zap size={24} color="#EAB308" className="mb-2" />
                    <Text className="text-3xl font-bold text-gray-900">{stats.averageEnergy}/10</Text>
                    <Text className="text-yellow-700 font-medium">Avg Energy</Text>
                </View>

                {/* Avg Stress */}
                <View className="w-[48%] bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm mb-4">
                    <Frown size={24} color="#A855F7" className="mb-2" />
                    <Text className="text-3xl font-bold text-gray-900">{stats.averageStress}/10</Text>
                    <Text className="text-purple-700 font-medium">Avg Stress</Text>
                </View>
            </View>

            <Card className="p-5 mt-2">
                <Text className="text-lg font-bold text-gray-900 mb-4">Top Emotion</Text>
                <View className="items-center justify-center py-6">
                    <Text className="text-4xl font-bold text-teal-600 capitalize mb-2">{stats.topEmotion}</Text>
                    <Text className="text-gray-500 text-center">Most frequent emotion over the last 30 days</Text>
                </View>
            </Card>

            {/* Placeholder for Chart */}
            <Card className="p-5 mt-2 mb-8">
                <Text className="text-lg font-bold text-gray-900 mb-4">Mood Trends</Text>
                <View className="h-40 bg-gray-50 rounded-lg items-center justify-center border-2 border-dashed border-gray-200">
                    <BarChart3 size={32} color="#9CA3AF" />
                    <Text className="text-gray-400 mt-2">Chart coming soon</Text>
                </View>
            </Card>
        </ScrollView>
    );
}
