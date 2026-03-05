import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import Layout from '../components/Layout';
import userService from '../services/userService';
import { LogOut } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function SettingsPage() {
    const navigate = useNavigate();
    const { theme, setThemeMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('profile');

    const [twoFactorStatus, setTwoFactorStatus] = useState({ enabled: false, backupCodesRemaining: 0 });
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [disable2FAForm, setDisable2FAForm] = useState({ password: '', token: '' });

    const [profileForm, setProfileForm] = useState({ name: '', email: '', role: '', avatar: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [previewAvatar, setPreviewAvatar] = useState('');

    useEffect(() => {
        loadUserProfile();
        load2FAStatus();
    }, []);

    const load2FAStatus = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const response = await axios.get('/2fa/status', { headers: { Authorization: `Bearer ${token}` } });
            setTwoFactorStatus(response.data);
        } catch (error) { console.error('Error loading 2FA status:', error); }
    };

    const loadUserProfile = async () => {
        try {
            const token = getToken();
            if (token) {
                const profileData = await userService.getUserProfile();
                setProfileForm({ name: profileData.name || '', email: profileData.email || '', role: profileData.role || '', avatar: profileData.avatar || '' });
                setPreviewAvatar(profileData.avatar || '');
                localStorage.setItem('userName', profileData.name);
                localStorage.setItem('userEmail', profileData.email);
                localStorage.setItem('userRole', profileData.role);
                localStorage.setItem('userAvatar', profileData.avatar || '');
            }
        } catch (error) {
            const userName = localStorage.getItem('userName') || '';
            const userEmail = localStorage.getItem('userEmail') || '';
            const userRole = localStorage.getItem('userRole') || '';
            const userAvatar = localStorage.getItem('userAvatar') || '';
            setProfileForm({ name: userName, email: userEmail, role: userRole, avatar: userAvatar });
            setPreviewAvatar(userAvatar);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image size must be less than 2MB' }); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewAvatar(reader.result);
                setProfileForm(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleThemeChange = (newTheme) => {
        setThemeMode(newTheme);
        setMessage({ type: 'success', text: `Theme changed to ${newTheme}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const updateData = { name: profileForm.name, email: profileForm.email, avatar: previewAvatar || profileForm.avatar || '' };
            const response = await userService.updateUserProfile(updateData);
            if (response.user) {
                localStorage.setItem('userName', response.user.name);
                localStorage.setItem('userEmail', response.user.email);
                localStorage.setItem('userAvatar', response.user.avatar || '');
                setProfileForm({ name: response.user.name, email: response.user.email, role: response.user.role, avatar: response.user.avatar || '' });
                setPreviewAvatar(response.user.avatar || '');
            }
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile.' });
        } finally { setLoading(false); }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        if (passwordForm.newPassword !== passwordForm.confirmPassword) { setMessage({ type: 'error', text: 'New passwords do not match' }); setLoading(false); return; }
        if (passwordForm.newPassword.length < 6) { setMessage({ type: 'error', text: 'Password must be at least 6 characters' }); setLoading(false); return; }
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const response = await axios.put('/users/change-password',
                { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password.' });
        } finally { setLoading(false); }
    };

    const handleSetup2FA = async () => {
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const response = await axios.post('/2fa/setup', {}, { headers: { Authorization: `Bearer ${token}` } });
            navigate('/setup-2fa', { state: { qrCode: response.data.qrCode, secret: response.data.secret, backupCodes: response.data.backupCodes } });
        } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to setup 2FA' }); }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const response = await axios.post('/2fa/disable',
                { password: disable2FAForm.password, token: disable2FAForm.token },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                setMessage({ type: 'success', text: '2FA disabled successfully!' });
                setTwoFactorStatus({ enabled: false, backupCodesRemaining: 0 });
                setShowDisable2FA(false);
                setDisable2FAForm({ password: '', token: '' });
            }
        } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to disable 2FA' }); }
        finally { setLoading(false); }
    };

    const handleRegenerateBackupCodes = async () => {
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const response = await axios.post('/2fa/regenerate-backup-codes', {}, { headers: { Authorization: `Bearer ${token}` } });
            navigate('/2fa-backup-codes', { state: { backupCodes: response.data.backupCodes } });
        } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to regenerate backup codes' }); }
    };

    // ✅ Full logout — clears all localStorage keys and redirects to /login
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('userId');
        localStorage.removeItem('lastSelectedProjectId');
        navigate('/login');
    };

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'security', label: 'Security' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'account', label: 'Account' },
    ];

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h1>

                {message.text && (
                    <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-300 dark:border-gray-600 mb-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-4 font-semibold ${
                                activeTab === tab.id
                                    ? `border-b-2 ${tab.id === 'account' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-blue-500 text-blue-600 dark:text-blue-400'}`
                                    : `text-gray-600 dark:text-gray-400 ${tab.id === 'account' ? 'hover:text-red-500' : 'hover:text-blue-500'}`
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Profile Information</h2>
                        <form onSubmit={handleSaveProfile}>
                            <div className="mb-6 flex items-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-4 flex items-center justify-center">
                                    {previewAvatar
                                        ? <img src={previewAvatar} alt="Avatar" className="w-full h-full object-contain" />
                                        : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">{profileForm.name.charAt(0).toUpperCase() || '?'}</div>
                                    }
                                </div>
                                <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                                    Change Avatar
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">Role</label>
                                <input type="text" value={profileForm.role}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-white" disabled />
                            </div>
                            <button type="submit" disabled={loading}
                                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg disabled:opacity-50">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Change Password</h2>
                            <form onSubmit={handleSavePassword}>
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                                    <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                                    <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                                    <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg disabled:opacity-50">
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Two-Factor Authentication</h2>
                            {!twoFactorStatus.enabled ? (
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">Enhance your account security by enabling two-factor authentication.</p>
                                    <button onClick={handleSetup2FA} className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg">Enable 2FA</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center mb-4">
                                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                        <span className="text-green-600 dark:text-green-400 font-semibold">2FA is enabled</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">Backup codes remaining: <strong>{twoFactorStatus.backupCodesRemaining}</strong></p>
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={handleRegenerateBackupCodes} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg">Regenerate Backup Codes</button>
                                        <button onClick={() => setShowDisable2FA(!showDisable2FA)} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg">Disable 2FA</button>
                                    </div>
                                    {showDisable2FA && (
                                        <form onSubmit={handleDisable2FA} className="mt-4 p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20">
                                            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">Disable Two-Factor Authentication</h3>
                                            <div className="mb-3">
                                                <label className="block text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                                <input type="password" value={disable2FAForm.password}
                                                    onChange={(e) => setDisable2FAForm({ ...disable2FAForm, password: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-gray-700 dark:text-gray-300 mb-1">2FA Token</label>
                                                <input type="text" value={disable2FAForm.token}
                                                    onChange={(e) => setDisable2FAForm({ ...disable2FAForm, token: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Enter 6-digit code" required />
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                                                    {loading ? 'Disabling...' : 'Confirm Disable'}
                                                </button>
                                                <button type="button" onClick={() => setShowDisable2FA(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg">Cancel</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Theme</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Choose your preferred theme</p>
                        <div className="flex gap-4">
                            <button onClick={() => handleThemeChange('light')}
                                className={`px-6 py-3 rounded-lg border-2 ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600'}`}>
                                ☀️ Light
                            </button>
                            <button onClick={() => handleThemeChange('dark')}
                                className={`px-6 py-3 rounded-lg border-2 ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600'}`}>
                                🌙 Dark
                            </button>
                        </div>
                    </div>
                )}

                {/* ✅ Account Tab — Logout lives here */}
                {activeTab === 'account' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">Account</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Manage your account session.</p>

                        <div className="border border-red-200 dark:border-red-800 rounded-lg p-5 bg-red-50 dark:bg-red-900/20">
                            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1">Sign Out</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                You will be logged out of your BuildWise account and redirected to the login page.
                            </p>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg transition-colors font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}

export default SettingsPage;