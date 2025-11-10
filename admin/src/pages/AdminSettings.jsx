import React, { useState, useEffect } from 'react';
import settingsService from '../services/settingsService';

const AdminSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Settings State
  const [generalSettings, setGeneralSettings] = useState({});
  const [securitySettings, setSecuritySettings] = useState({});
  const [notificationSettings, setNotificationSettings] = useState({});
  const [systemSettings, setSystemSettings] = useState({});
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchProfile();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getAllSettings();
      
      setGeneralSettings(response.general || {});
      setSecuritySettings(response.security || {});
      setNotificationSettings(response.notifications || {});
      setSystemSettings(response.system || {});
      
    } catch (error) {
      console.error('Error fetching settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await settingsService.getProfile();
      setProfileSettings({
        name: response.name || '',
        email: response.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings('general', generalSettings);
      showMessage('success', 'General settings saved successfully!');
    } catch (error) {
      console.error('Error saving general settings:', error);
      showMessage('error', 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings('security', securitySettings);
      showMessage('success', 'Security settings saved successfully!');
    } catch (error) {
      console.error('Error saving security settings:', error);
      showMessage('error', 'Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings('notifications', notificationSettings);
      showMessage('success', 'Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showMessage('error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings('system', systemSettings);
      showMessage('success', 'System settings saved successfully!');
    } catch (error) {
      console.error('Error saving system settings:', error);
      showMessage('error', 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profileSettings.newPassword && profileSettings.newPassword !== profileSettings.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await settingsService.updateProfile(profileSettings);
      showMessage('success', 'Profile updated successfully!');
      setProfileSettings({ ...profileSettings, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async (category) => {
    if (!window.confirm(`Are you sure you want to reset ${category} settings to default?`)) {
      return;
    }

    try {
      setSaving(true);
      await settingsService.resetSettings(category);
      await fetchSettings();
      showMessage('success', `${category} settings reset to default successfully!`);
    } catch (error) {
      console.error(`Error resetting ${category} settings:`, error);
      showMessage('error', `Failed to reset ${category} settings`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'system', name: 'System', icon: '🖥️' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Settings</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your application settings and preferences</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">{message.type === 'success' ? '✅' : '❌'}</span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              
              {/* General Settings Tab */}
              {activeTab === 'general' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">General Settings</h2>
                    <button
                      onClick={() => handleResetSettings('general')}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Application Name</label>
                      <input
                        type="text"
                        value={generalSettings.appName || ''}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="BuildWise"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                      <input
                        type="text"
                        value={generalSettings.companyName || ''}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Your Company Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                        <input
                          type="email"
                          value={generalSettings.supportEmail || ''}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="support@buildwise.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Phone</label>
                        <input
                          type="tel"
                          value={generalSettings.supportPhone || ''}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="+63 xxx xxx xxxx"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                        <select
                          value={generalSettings.timezone || 'Asia/Manila'}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Asia/Manila">Asia/Manila</option>
                          <option value="Asia/Singapore">Asia/Singapore</option>
                          <option value="Asia/Tokyo">Asia/Tokyo</option>
                          <option value="America/New_York">America/New York</option>
                          <option value="Europe/London">Europe/London</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Format</label>
                        <select
                          value={generalSettings.dateFormat || 'MM/DD/YYYY'}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                        <select
                          value={generalSettings.language || 'en'}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="en">English</option>
                          <option value="fil">Filipino</option>
                          <option value="es">Spanish</option>
                          <option value="zh">Chinese</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items Per Page</label>
                        <select
                          value={generalSettings.itemsPerPage || 10}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, itemsPerPage: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Project Status</label>
                      <select
                        value={generalSettings.defaultProjectStatus || 'Not Started'}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, defaultProjectStatus: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Default status for newly created projects</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Project Statuses</label>
                      <input
                        type="text"
                        value={generalSettings.projectStatuses || 'Not Started, Planning, In Progress, On Hold, Completed, Cancelled'}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, projectStatuses: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Not Started, Planning, In Progress, On Hold, Completed, Cancelled"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comma-separated list of available project statuses</p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveGeneral}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Settings Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileSettings.name}
                        onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Your Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profileSettings.email}
                        onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                          <input
                            type="password"
                            value={profileSettings.currentPassword}
                            onChange={(e) => setProfileSettings({ ...profileSettings, currentPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Enter current password"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                          <input
                            type="password"
                            value={profileSettings.newPassword}
                            onChange={(e) => setProfileSettings({ ...profileSettings, newPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Enter new password"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={profileSettings.confirmPassword}
                            onChange={(e) => setProfileSettings({ ...profileSettings, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Update Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings Tab */}
              {activeTab === 'security' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h2>
                    <button
                      onClick={() => handleResetSettings('security')}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={securitySettings.sessionTimeout || 30}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="5"
                          max="1440"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Login Attempts</label>
                        <input
                          type="number"
                          value={securitySettings.maxLoginAttempts || 5}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="3"
                          max="10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Minimum Length</label>
                      <input
                        type="number"
                        value={securitySettings.passwordMinLength || 8}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) || 8 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="6"
                        max="20"
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Requirements</h3>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireSpecialChar !== false}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChar: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require special character (!@#$%^&*)</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireNumber !== false}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumber: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require number (0-9)</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireUppercase !== false}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require uppercase letter (A-Z)</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.enable2FA || false}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, enable2FA: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Two-Factor Authentication (2FA)</span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveSecurity}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
                    <button
                      onClick={() => handleResetSettings('notifications')}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications !== false}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Email Notifications</span>
                      </label>
                      <p className="ml-6 mt-1 text-sm text-gray-500 dark:text-gray-400">Receive email notifications for important events</p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Project Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.projectCreated !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, projectCreated: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New project created</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.projectUpdated !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, projectUpdated: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Project updated</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.projectDeleted !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, projectDeleted: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Project deleted</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">User Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.userCreated !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, userCreated: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New user registered</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.userRoleChanged !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, userRoleChanged: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">User role changed</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">System Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.systemAlerts !== false}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, systemAlerts: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">System alerts and warnings</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* System Settings Tab */}
              {activeTab === 'system' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h2>
                    <button
                      onClick={() => handleResetSettings('system')}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Reset to Default
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="text-yellow-600 dark:text-yellow-400 mr-2">⚠️</span>
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Maintenance Mode</h3>
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">When enabled, only admins can access the application</p>
                          <label className="flex items-center mt-3">
                            <input
                              type="checkbox"
                              checked={systemSettings.maintenanceMode || false}
                              onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">Enable Maintenance Mode</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.allowNewRegistrations !== false}
                          onChange={(e) => setSystemSettings({ ...systemSettings, allowNewRegistrations: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Allow New User Registrations</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.enableAuditLogs !== false}
                          onChange={(e) => setSystemSettings({ ...systemSettings, enableAuditLogs: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Audit Logs</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Projects Per User</label>
                        <input
                          type="number"
                          value={systemSettings.maxProjectsPerUser || 50}
                          onChange={(e) => setSystemSettings({ ...systemSettings, maxProjectsPerUser: parseInt(e.target.value) || 50 })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="1"
                          max="1000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max File Size (MB)</label>
                        <input
                          type="number"
                          value={systemSettings.maxFileSize || 10}
                          onChange={(e) => setSystemSettings({ ...systemSettings, maxFileSize: parseInt(e.target.value) || 10 })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allowed File Types</label>
                      <input
                        type="text"
                        value={systemSettings.allowedFileTypes || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, allowedFileTypes: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="pdf,doc,docx,xls,xlsx,jpg,png"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comma-separated list of allowed file extensions</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Log Retention (days)</label>
                      <input
                        type="number"
                        value={systemSettings.auditLogRetention || 90}
                        onChange={(e) => setSystemSettings({ ...systemSettings, auditLogRetention: parseInt(e.target.value) || 90 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="30"
                        max="365"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Number of days to retain audit logs before archiving</p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveSystem}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
