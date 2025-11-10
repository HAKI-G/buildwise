import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

class UserService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Add auth token to requests
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Get user profile from backend
  async getUserProfile() {
    try {
      const response = await this.axiosInstance.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile (including avatar)
  async updateUserProfile(profileData) {
    try {
      const response = await this.axiosInstance.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.axiosInstance.put('/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;