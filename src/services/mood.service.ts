const API_BASE_URL = 'http://localhost:3001'; // Correct port for Aurora backend

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const moodService = {
  async createMoodLog(moodData: any) {
    try {
      console.log('🚀 Sending mood data to:', `${API_BASE_URL}/api/moods`);
      console.log('📤 Mood data:', moodData);
      
      const response = await fetch(`${API_BASE_URL}/api/moods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(moodData),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Mood log created successfully:', result);
      return result;
    } catch (error) {
      console.error('💥 Create mood log error:', error);
      throw error;
    }
  },

  async getMoodLogs(userId: string, startDate?: string, endDate?: string) {
    try {
      let url = `${API_BASE_URL}/api/moods`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('📊 Fetching mood logs from:', url);

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Mood logs fetched:', result.length, 'entries');
      return result;
    } catch (error) {
      console.error('💥 Get mood logs error:', error);
      throw error;
    }
  }
};

