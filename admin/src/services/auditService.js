import api from './api';

const auditService = {
  // Get all audit logs
  getAllLogs: async (params = {}) => {
    try {
      const response = await api.get('/admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get logs by user
  getLogsByUser: async (userId) => {
    try {
      const response = await api.get(`/admin/audit-logs/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user logs:', error);
      throw error;
    }
  },
};

export default auditService;