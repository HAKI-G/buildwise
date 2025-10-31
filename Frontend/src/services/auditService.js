import axios from 'axios';

// ⚙️ Your backend URL
const API_BASE_URL = 'http://localhost:5001/api';

export const LOG_TYPES = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  FAILED_LOGIN: 'FAILED_LOGIN',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
};

class AuditService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Add auth token to requests
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token'); // Matches your localStorage key
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  getCurrentUser() {
    try {
      // Get user data from your localStorage structure
      return {
        id: localStorage.getItem('userId') || 'unknown',
        name: localStorage.getItem('userName') || 'Unknown User',
        email: localStorage.getItem('userEmail') || 'no-email@example.com',
        role: localStorage.getItem('userRole') || 'User',
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        id: 'unknown',
        name: 'Unknown User',
        email: 'no-email@example.com',
        role: 'User',
      };
    }
  }

  async createLog(logData) {
    try {
      const user = this.getCurrentUser();
      
      const payload = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: logData.action,
        actionDescription: logData.actionDescription,
        status: logData.status || 'SUCCESS',
        targetResource: logData.targetResource || null,
        targetId: logData.targetId || null,
        oldValue: logData.oldValue ? JSON.stringify(logData.oldValue) : null,
        newValue: logData.newValue ? JSON.stringify(logData.newValue) : null,
        errorMessage: logData.errorMessage || null,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      // Send to your backend audit endpoint
      const response = await this.axiosInstance.post('/audit-logs', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't break the app if logging fails
      return null;
    }
  }

  // Log user login
  async logLogin(userId, userName, userEmail, success = true) {
    return this.createLog({
      action: success ? LOG_TYPES.USER_LOGIN : LOG_TYPES.FAILED_LOGIN,
      actionDescription: success 
        ? `User ${userName} logged in successfully` 
        : `Failed login attempt for ${userEmail}`,
      status: success ? 'SUCCESS' : 'FAILED',
      targetResource: 'Authentication',
      targetId: userId,
    });
  }

  // Log user logout
  async logLogout() {
    const user = this.getCurrentUser();
    return this.createLog({
      action: LOG_TYPES.USER_LOGOUT,
      actionDescription: `User ${user.name} logged out`,
      status: 'SUCCESS',
      targetResource: 'Authentication',
    });
  }

  // Log user registration
  async logUserCreated(userId, userName, userEmail) {
    return this.createLog({
      action: LOG_TYPES.USER_CREATED,
      actionDescription: `New user registered: ${userName}`,
      status: 'SUCCESS',
      targetResource: 'User',
      targetId: userId,
      newValue: { name: userName, email: userEmail },
    });
  }

  // Log password change
  async logPasswordChange(success = true, errorMessage = null) {
    return this.createLog({
      action: LOG_TYPES.PASSWORD_CHANGED,
      actionDescription: success ? 'Password changed successfully' : 'Failed to change password',
      status: success ? 'SUCCESS' : 'FAILED',
      targetResource: 'User',
      errorMessage,
    });
  }

  // Log profile update
  async logProfileUpdated(oldData, newData) {
    return this.createLog({
      action: LOG_TYPES.PROFILE_UPDATED,
      actionDescription: 'User updated their profile',
      status: 'SUCCESS',
      targetResource: 'Profile',
      oldValue: oldData,
      newValue: newData,
    });
  }

  // ==================== PROJECT ACTIONS ====================

  // Log project creation
  async logProjectCreated(projectId, projectName, projectData) {
    return this.createLog({
      action: 'PROJECT_CREATED',
      actionDescription: `Created new project: ${projectName}`,
      status: 'SUCCESS',
      targetResource: 'Project',
      targetId: projectId,
      newValue: projectData,
    });
  }

  // Log project update
  async logProjectUpdated(projectId, projectName, oldData, newData) {
    return this.createLog({
      action: 'PROJECT_UPDATED',
      actionDescription: `Updated project: ${projectName}`,
      status: 'SUCCESS',
      targetResource: 'Project',
      targetId: projectId,
      oldValue: oldData,
      newValue: newData,
    });
  }

  // Log project deletion
  async logProjectDeleted(projectId, projectName) {
    return this.createLog({
      action: 'PROJECT_DELETED',
      actionDescription: `Deleted project: ${projectName}`,
      status: 'SUCCESS',
      targetResource: 'Project',
      targetId: projectId,
    });
  }
}

const auditService = new AuditService();
export default auditService;








