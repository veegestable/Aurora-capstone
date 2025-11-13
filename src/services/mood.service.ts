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
        log_date: moodData.log_date,
        energy_level: moodData.energy_level || 5,
        stress_level: moodData.stress_level || 3,
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
  }
};

