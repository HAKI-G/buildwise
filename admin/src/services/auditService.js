import api from './api';

// ----------------------------
// Audit service for admin logs
// ----------------------------
const auditService = {
  // Get all audit logs (with optional params for limit, lastKey, etc.)
  getAllLogs: async (params = {}) => {
    try {
      const response = await api.get('/admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get logs by user ID
  getLogsByUser: async (userId) => {
    try {
      const response = await api.get(`/admin/audit-logs/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user logs:', error);
      throw error;
    }
  },

  // Get logs by action type
  getLogsByAction: async (action) => {
    try {
      const response = await api.get(`/admin/audit-logs/action/${action}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching action logs:', error);
      throw error;
    }
  },

  // Get logs by date range
  getLogsByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get('/admin/audit-logs/date-range', {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching logs by date range:', error);
      throw error;
    }
  },

  // Create a new audit log
  createLog: async (logData) => {
    try {
      const response = await api.post('/admin/audit-logs', logData);
      return response.data;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },
  
  // ✅ FIXED: Archive function - sends logId AND timestamp in body
  archiveLog: async (logId, timestamp) => {
    try {
      const response = await api.post('/admin/audit-logs/archive', {
        logId,
        timestamp
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error archiving log:', error);
      throw error;
    }
  },

  // ✅ FIXED: Unarchive function - sends logId AND timestamp in body
  unarchiveLog: async (logId, timestamp) => {
    try {
      const response = await api.post('/admin/audit-logs/unarchive', {
        logId,
        timestamp
      });
      return response.data;
    } catch (error) {
      console.error('Error unarchiving log:', error);
      throw error;
    }
  },

  // ✅ FIXED: Bulk archive - sends array of {logId, timestamp} objects
  bulkArchiveLogs: async (logs) => {
    try {
      const response = await api.post('/admin/audit-logs/bulk-archive', { 
        logs  // Array of {logId, timestamp}
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk archiving logs:', error);
      throw error;
    }
  },

  // Export logs to CSV
  exportLogs: async (params = {}) => {
    try {
      const response = await api.get('/admin/audit-logs/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting logs:', error);
      throw error;
    }
  },
};

// ----------------------------
// Log types constants
// ----------------------------
export const LOG_TYPES = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  DATA_EXPORT: 'DATA_EXPORT',
  FAILED_LOGIN: 'FAILED_LOGIN',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
};

// ✅ Default export
export default auditService;

// Optional named export for backward compatibility
export const createAuditLog = auditService.createLog;


















