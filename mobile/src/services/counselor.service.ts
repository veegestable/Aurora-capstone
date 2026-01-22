// Removed unused import from 'firebase/firestore'

// Define interfaces
interface StudentInfo {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface MoodLogResponse {
  id: string;
  user_id: string;
  emotions: string[];
  colors: string[];
  confidence: number[];
  note?: string;
  log_date: string;
}

interface ScheduleResponse {
  id: string;
  user_id: string;
  event_type: string;
  event_date: string;
  description?: string;
}

export const counselorService = {
  async grantAccess(counselorId: string, studentId: string) {
    try {
      const response = await fetch('/api/counselor/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          counselor_id: counselorId,
          student_id: studentId
        })
      });

      if (!response.ok) throw new Error('Failed to grant access');
      return await response.json();
    } catch (error) {
      console.error('Error granting access:', error);
      throw error;
    }
  },

  async revokeAccess(accessId: string) {
    try {
      const response = await fetch(`/api/counselor/access/${accessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to revoke access');
      return await response.json();
    } catch (error) {
      console.error('Error revoking access:', error);
      throw error;
    }
  },

  async getAccessibleStudents(counselorId: string): Promise<StudentInfo[]> {
    try {
      const response = await fetch(`/api/counselor/accessible-students?counselorId=${counselorId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch accessible students');
      return await response.json();
    } catch (error) {
      console.error('Error fetching accessible students:', error);
      return [];
    }
  },

  async getStudents(): Promise<StudentInfo[]> {
    try {
      const response = await fetch('/api/counselor/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch students');
      return await response.json();
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },

  async getStudentMoodLogs(studentId: string, startDate?: string, endDate?: string): Promise<MoodLogResponse[]> {
    try {
      let url = `/api/counselor/students/${studentId}/moods`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch mood logs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching student mood logs:', error);
      return [];
    }
  },

  async getStudentSchedules(studentId: string, startDate?: string, endDate?: string): Promise<ScheduleResponse[]> {
    try {
      let url = `/api/counselor/students/${studentId}/schedules`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch schedules');
      return await response.json();
    } catch (error) {
      console.error('Error fetching student schedules:', error);
      return [];
    }
  },

  async sendMessageToStudent(counselorId: string, studentId: string, message: string) {
    try {
      const response = await fetch('/api/counselor/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          counselor_id: counselorId,
          student_id: studentId,
          message
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};
