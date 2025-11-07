// admin/src/hooks/useMaintenanceMode.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        // Get auth token
        const token = localStorage.getItem('authToken');
        
        // Create config with auth header if token exists
        const config = token ? {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        } : {};

        const response = await axios.get(
          'http://localhost:5001/api/maintenance-status',
          config
        );
        
        const maintenanceEnabled = response.data.value === true;
        setIsMaintenanceMode(maintenanceEnabled);
      } catch (error) {
        // Don't log 401 errors on login page - they're expected
        if (error.response?.status !== 401) {
          console.error('Error checking maintenance mode:', error);
        }
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkMaintenanceMode();
    
    // Check every 30 seconds - but only if user is authenticated
    const interval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token) {
        checkMaintenanceMode();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { isMaintenanceMode, loading };
};