import { useCallback } from 'react';
import { createAuditLog, LOG_TYPES } from '../services/auditService';
import { auth } from '../utils/auth';

export const useAuditLog = () => {
  const getCurrentUser = () => {
    // Try to get user from auth utility first
    const user = auth.getUser();
    if (user) return user;
    
    // Fallback to localStorage
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        return {};
      }
    }
    
    return {};
  };

  const getClientInfo = () => {
    return {
      ipAddress: 'Client-IP', // This will need to be fetched from your backend
      userAgent: navigator.userAgent,
    };
  };

  const logAction = useCallback(async (action, description, additionalData = {}) => {
    try {
      const user = getCurrentUser();
      const clientInfo = getClientInfo();

      await createAuditLog({
        userId: additionalData.userId || user.userId || user.id || 'unknown',
        userName: additionalData.userName || user.name || 'Unknown User',
        userEmail: additionalData.userEmail || user.email || 'unknown@email.com',
        action,
        actionDescription: description,
        ...clientInfo,
        ...additionalData,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error - logging should not break the app
    }
  }, []);

  return { logAction, LOG_TYPES };
};