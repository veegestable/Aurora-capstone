const API_BASE_URL = 'http://localhost:3001';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'counselor';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'counselor';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserResponse;
}

export interface SignUpResponse {
  message: string;
  token: string;
  user: UserResponse;
}

// import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeaders = async () => {
  // const token = await AsyncStorage.getItem('token');
  const token = null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const authService = {
  async signUp(data: SignUpData): Promise<SignUpResponse> {
    try {
      console.log('📤 Sending signup request to:', `${API_BASE_URL}/api/auth/signup`);
      console.log('📝 Signup data:', { ...data, password: '***' });

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });

      console.log('📥 Signup response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Signup error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Signup successful:', { ...result, token: '***' });

      return result;
    } catch (error) {
      console.error('💥 Signup error:', error);
      throw error;
    }
  },

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      console.log('📤 Sending login request to:', `${API_BASE_URL}/api/auth/login`);
      console.log('🔐 Login data:', { ...data, password: '***' });

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });

      console.log('📥 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Login error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Login successful:', { ...result, token: '***' });
      return result;
    } catch (error) {
      console.error('💥 Login error:', error);
      throw error;
    }
  },

  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};
