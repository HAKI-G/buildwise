<<<<<<< HEAD:admin/src/contexts/SettingsContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import settingsService from '../services/settingsService';
=======
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom'; // ✅ ADD THIS
import settingsService from '../../services/settingsService';
import { auth } from '../../utils/auth'; // ✅ ADD THIS
>>>>>>> 3265439 (Admin Dashboard Not static):admin/src/components/contexts/SettingsContext.jsx

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const location = useLocation(); // ✅ ADD THIS
  const [settings, setSettings] = useState({
    general: {
      appName: 'BuildWise',
      companyName: '',
      supportEmail: '',
      supportPhone: '',
      timezone: 'Asia/Manila',
      dateFormat: 'MM/DD/YYYY',
      currency: 'PHP'
    },
    security: {},
    notifications: {},
    system: {}
  });
  
<<<<<<< HEAD:admin/src/contexts/SettingsContext.jsx
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
=======
  const [loading, setLoading] = useState(false); // ✅ CHANGED to false
>>>>>>> 3265439 (Admin Dashboard Not static):admin/src/components/contexts/SettingsContext.jsx

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getAllSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      // Don't throw - keep default settings
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD:admin/src/contexts/SettingsContext.jsx
  }, []);
=======
  };

  useEffect(() => {
    // ✅ ONLY fetch settings if authenticated AND not on login page
    const isAuthenticated = auth.isAuthenticated();
    const isLoginPage = location.pathname === '/login';
    
    if (isAuthenticated && !isLoginPage) {
      fetchSettings();
    }
  }, [location.pathname]); // ✅ Re-run when route changes
>>>>>>> 3265439 (Admin Dashboard Not static):admin/src/components/contexts/SettingsContext.jsx

  useEffect(() => {
    // This will only run when component mounts
    // And it will ONLY mount when user is authenticated (inside ProtectedRoute)
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};