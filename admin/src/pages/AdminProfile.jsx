import { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Shield, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { auth } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useAuditLog } from '../hooks/useAuditLog';

const AdminProfile = () => {
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const notify = useNotification();
  const { logAction, LOG_TYPES } = useAuditLog();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/profile/me');
      const u = res.data;
      setProfile({ name: u.name || '', email: u.email || '', role: u.role || 'Admin' });
      auth.setUser(u);
    } catch (err) {
      // fallback to localStorage
      const u = auth.getUser();
      if (u) setProfile({ name: u.name || '', email: u.email || '', role: u.role || 'Admin' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) { notify.warning('Name cannot be empty'); return; }

    try {
      setSaving(true);
      await api.put('/settings/profile/me', { name: profile.name });

      // Update localStorage
      const u = auth.getUser();
      if (u) auth.setUser({ ...u, name: profile.name });

      await logAction(
        LOG_TYPES.USER_UPDATED || 'USER_UPDATED',
        'Admin updated their profile name',
        { status: 'SUCCESS' }
      );

      notify.success('Profile updated');
    } catch (err) {
      console.error('Profile update error:', err);
      notify.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.warning('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      notify.warning('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.warning('New passwords do not match');
      return;
    }

    try {
      setChangingPw(true);
      await api.put('/settings/profile/me', { currentPassword, newPassword });

      await logAction(
        LOG_TYPES.PASSWORD_CHANGED || 'PASSWORD_CHANGED',
        'Admin changed their password',
        { status: 'SUCCESS' }
      );

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify.success('Password changed successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      notify.error(msg);
    } finally {
      setChangingPw(false);
    }
  };

  const togglePwVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Admin Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account details and security</p>
      </div>

      {/* Avatar + Role */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {profile.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 px-3 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              <Shield className="w-3 h-3" /> {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" /> Profile Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" /> Change Password
        </h3>

        {[
          { key: 'current', label: 'Current Password', field: 'currentPassword' },
          { key: 'new', label: 'New Password', field: 'newPassword' },
          { key: 'confirm', label: 'Confirm New Password', field: 'confirmPassword' },
        ].map(({ key, label, field }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="relative">
              <input
                type={showPasswords[key] ? 'text' : 'password'}
                value={passwordData[field]}
                onChange={e => setPasswordData(p => ({ ...p, [field]: e.target.value }))}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
              <button
                type="button"
                onClick={() => togglePwVisibility(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={changingPw}
          className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          {changingPw ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {changingPw ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default AdminProfile;
