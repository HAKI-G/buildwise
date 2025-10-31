import api from './api';

const settingsService = {
  // Get all settings
  getAllSettings: async () => {
    try {
      const response = await api.get('/admin/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  },

  // Get settings by category
  getSettingsByCategory: async (category) => {
    try {
      const response = await api.get(`/admin/settings/${category}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      throw error;
    }
  },

  // Update settings for a specific category
  updateSettings: async (category, settingsData) => {
    try {
      const response = await api.put(`/admin/settings/${category}`, settingsData);
      return response.data;
    } catch (error) {
      console.error(`Error updating ${category} settings:`, error);
      throw error;
    }
  },

  // Reset settings to default for a category
  resetSettings: async (category) => {
    try {
      const response = await api.post(`/admin/settings/${category}/reset`);
      return response.data;
    } catch (error) {
      console.error(`Error resetting ${category} settings:`, error);
      throw error;
    }
  },

  // Get admin profile
  getProfile: async () => {
    try {
      const response = await api.get('/admin/settings/profile/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update admin profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/admin/settings/profile/me', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
};

export default settingsService;