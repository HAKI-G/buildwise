import { useState, useEffect } from 'react';
import axios from 'axios';

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/maintenance-status');
        const maintenanceEnabled = response.data.value === true;
        setIsMaintenanceMode(maintenanceEnabled);
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();
    
    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isMaintenanceMode, loading };
};