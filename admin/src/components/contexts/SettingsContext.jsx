import React, { createContext, useState, useEffect, useContext } from 'react';
import settingsService from '../../services/settingsService';

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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};