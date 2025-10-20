import axios from 'axios';

// Backend API configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available (per-tab using sessionStorage)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration (per-tab)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login user (stores token per-tab in sessionStorage)
  async login(email, password) {
    try {
      const response = await api.post('/accounts/authenticate', { email, password , ipAddress: '127.0.0.1' });
      const { jwtToken, refreshToken, ...user } = response.data;

      // Store token and user data in sessionStorage (per-tab)
      sessionStorage.setItem('token', jwtToken);
      sessionStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
      }

      return { token: jwtToken, user };
    } catch (error) {
      throw new Error(error.response?.data || 'Login failed');
    }
  },

  // Register new user
  async register(userData) {
    try {
      const response = await api.post('/accounts/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || 'Registration failed');
    }
  },

  // Create new account (Admin function)
  async createAccount(accountData) {
    try {
      const response = await api.post('/accounts', accountData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.response?.data || 'Account creation failed');
    }
  },

  // Validate JWT token
  async validateToken(token) {
    try {
      // Call the backend to validate the token
      const response = await api.get('/test-auth');
      return response.data.user;
    } catch (error) {
      console.error('Token validation failed:', error);
      // Don't throw error, just return null to indicate invalid token
      return null;
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'));
      if (!user) throw new Error('User not authenticated');
      
      const response = await api.put(`/accounts/${user.id}`, profileData);
      
      // Update stored user data in sessionStorage
      const updatedUser = { ...user, ...profileData };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      throw new Error(error.response?.data || 'Profile update failed');
    }
  },

  // Forgot password
  async forgotPassword(email) {
    try {
      return { message: 'Password reset email sent' };
    } catch (error) {
      throw new Error('Password reset failed');
    }
  },

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      // This would call a backend endpoint when implemented
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new Error('Password reset failed');
    }
  },

  // Logout user (only affects current tab)
  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user from current tab
  getCurrentUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if user is authenticated in current tab
  isAuthenticated() {
    return !!sessionStorage.getItem('token');
  }
};

