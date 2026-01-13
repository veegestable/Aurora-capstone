// Firebase-based mood service for Aurora
import { firestoreService } from './firebase-firestore.service';
import { auth } from '../config/firebase';

export const moodService = {
  async createMoodLog(moodData: any) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log('🔥 Creating mood log for user:', user.uid);

      const moodLog = await firestoreService.createMoodLog({
        emotions: moodData.emotions,
        notes: moodData.notes || '',
        log_date: typeof moodData.log_date === 'string' ? new Date(moodData.log_date) : moodData.log_date,
        energy_level: moodData.energy_level || 5,
        stress_level: moodData.stress_level || 3,
        sleep_quality: moodData.sleep_quality,
        classes_count: moodData.classes_count || 0,
        exams_count: moodData.exams_count || 0,
        deadlines_count: moodData.deadlines_count || 0,
        detection_method: moodData.detection_method || 'manual'
      }, user.uid);

      console.log('✅ Mood log created successfully');
      return moodLog;
    } catch (error) {
      console.error('❌ Create mood log error:', error);
      throw error;
    }
  },

  async getMoodLogs(userId: string, startDate?: string, endDate?: string) {
    try {
      console.log('🔥 Fetching mood logs for user:', userId);

      const startDateObj = startDate ? new Date(startDate) : undefined;
      const endDateObj = endDate ? new Date(endDate) : undefined;

      const moodLogs = await firestoreService.getMoodLogs(
        userId,
        startDateObj,
        endDateObj
      );

      console.log('✅ Mood logs fetched:', moodLogs.length, 'entries');
      return moodLogs;
    } catch (error) {
      console.error('❌ Get mood logs error:', error);
      throw error;
    }
  },

  async updateMoodLog(logId: string, moodData: any) {
    try {
      console.log('🔥 Updating mood log:', logId);

      const updatedLog = await firestoreService.updateMoodLog(logId, {
        emotions: moodData.emotions,
        notes: moodData.notes,
        energy_level: moodData.energy_level,
        stress_level: moodData.stress_level,
        sleep_quality: moodData.sleep_quality,
        classes_count: moodData.classes_count,
        exams_count: moodData.exams_count,
        deadlines_count: moodData.deadlines_count,
        detection_method: moodData.detection_method
      });

      console.log('✅ Mood log updated successfully');
      return updatedLog;
    } catch (error) {
      console.error('❌ Update mood log error:', error);
      throw error;
    }
  },

  generateInsights(logs: any[]) {
    const insights: string[] = [];
    if (!logs || logs.length < 3) return ["Keep logging for a few more days to unlock personalized AI insights about your mood patterns."];

    // Helper to get sleep score (normalize string/number)
    const getSleepScore = (log: any) => {
      if (typeof log.sleep_quality === 'number') return log.sleep_quality;
      if (log.sleep_quality === 'poor') return 1;
      if (log.sleep_quality === 'fair') return 2;
      if (log.sleep_quality === 'good') return 3;
      return 0;
    };

    // 1. Social/Academic Load Analysis
    const heavyDays = logs.filter(l => (l.classes_count || 0) >= 4 || (l.exams_count || 0) > 0 || (l.deadlines_count || 0) > 0);
    if (heavyDays.length > 2) {
      const heavyStress = heavyDays.reduce((acc, l) => acc + (l.stress_level || 0), 0) / heavyDays.length;
      const allStress = logs.reduce((acc, l) => acc + (l.stress_level || 0), 0) / logs.length;

      if (heavyStress > allStress + 1) {
        insights.push("Your mood tends to be lower and stress higher on days with heavy academic loads (4+ classes or deadlines).");
      } else if (heavyDays.some(l => (l.exams_count || 0) > 0)) {
        insights.push("Upcoming exams are a significant stressor for you. Consider scheduling specific relaxation breaks.");
      }
    }

    // 2. Sleep Quality Analysis
    const poorSleepDays = logs.filter(l => getSleepScore(l) === 1);
    const goodSleepDays = logs.filter(l => getSleepScore(l) === 3);

    if (poorSleepDays.length > 0) {
      const poorSleepEnergy = poorSleepDays.reduce((acc, l) => acc + (l.energy_level || 0), 0) / poorSleepDays.length;
      const avgEnergy = logs.reduce((acc, l) => acc + (l.energy_level || 0), 0) / logs.length;

      if (poorSleepEnergy < avgEnergy - 1) {
        insights.push("Poor sleep quality correlates strongly with low energy days. Prioritizing rest might improve your weekly rhythm.");
      }
    }

    if (goodSleepDays.length > 0) {
      const goodSleepMood = goodSleepDays.reduce((acc, l) => acc + (l.stress_level || 0), 0) / goodSleepDays.length;
      const avgStress = logs.reduce((acc, l) => acc + (l.stress_level || 0), 0) / logs.length;
      if (goodSleepMood < avgStress) {
        insights.push("You consistently report lower stress levels after a good night's sleep.");
      }
    }

    // 3. General Mood Trend
    const recentLogs = logs.slice(0, 5); // Most recent first (assuming sorted)
    const avgRecentStress = recentLogs.reduce((acc, l) => acc + (l.stress_level || 0), 0) / recentLogs.length;
    if (avgRecentStress > 7) {
      insights.push("You've been experiencing high stress recently. It might be time to use the 'Schedule' tab to book a counseling session.");
    }

    // Default Fallback
    if (insights.length === 0) {
      insights.push("Your mood patterns are currently stable. We'll keep analyzing as you log more data!");
    }

    return insights;
  },

  async getTodayMoodLog(userId: string) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const logs = await this.getMoodLogs(userId, startOfDay.toISOString(), endOfDay.toISOString());
      return logs.length > 0 ? logs[0] : null;
    } catch (error) {
      console.error('❌ Get today mood log error:', error);
      throw error;
    }
  }
};

