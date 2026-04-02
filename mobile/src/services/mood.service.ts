// Firebase-based mood service for Aurora
import { firestoreService } from './firebase-firestore.service';
import { auth } from './firebase';

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

