import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import settingsService from '../services/settingsService';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, []);

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