import api from './api';

const adminDashboardService = {
  /**
   * Get admin dashboard statistics
   * @returns {Promise} Dashboard stats (users, projects, trends)
   */
  getStats: async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Get recent activity feed for admin
   * @returns {Promise} Array of recent activities
   */
  getRecentActivity: async () => {
    try {
      const response = await api.get('/admin/dashboard/recent-activity');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin recent activity:', error);
      throw error;
    }
  },

  /**
   * Get system status metrics for admin
   * @returns {Promise} System health information
   */
  getSystemStatus: async () => {
    try {
      const response = await api.get('/admin/dashboard/system-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin system status:', error);
      throw error;
    }
  },
};

export default adminDashboardService;
