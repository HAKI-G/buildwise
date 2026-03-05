import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import userService from '../services/userService';
import { LogOut, X, User, Shield, Palette, Settings } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function SettingsModal({ isOpen, onClose }) {
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
        if (isOpen) {
            loadUserProfile();
            load2FAStatus();
            setMessage({ type: '', text: '' });
            setActiveTab('profile');
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const load2FAStatus = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const res = await axios.get('/2fa/status', { headers: { Authorization: `Bearer ${token}` } });
            setTwoFactorStatus(res.data);
        } catch (e) { console.error('2FA status error:', e); }
    };

    const loadUserProfile = async () => {
        try {
            const token = getToken();
            if (token) {
                const data = await userService.getUserProfile();
                setProfileForm({ name: data.name || '', email: data.email || '', role: data.role || '', avatar: data.avatar || '' });
                setPreviewAvatar(data.avatar || '');
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userEmail', data.email);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userAvatar', data.avatar || '');
            }
        } catch {
            setProfileForm({
                name: localStorage.getItem('userName') || '',
                email: localStorage.getItem('userEmail') || '',
                role: localStorage.getItem('userRole') || '',
                avatar: localStorage.getItem('userAvatar') || '',
            });
            setPreviewAvatar(localStorage.getItem('userAvatar') || '');
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be under 2MB' }); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewAvatar(reader.result);
            setProfileForm(prev => ({ ...prev, avatar: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const res = await userService.updateUserProfile({
                name: profileForm.name,
                email: profileForm.email,
                avatar: previewAvatar || profileForm.avatar || '',
            });
            if (res.user) {
                localStorage.setItem('userName', res.user.name);
                localStorage.setItem('userEmail', res.user.email);
                localStorage.setItem('userAvatar', res.user.avatar || '');
                setProfileForm({ name: res.user.name, email: res.user.email, role: res.user.role, avatar: res.user.avatar || '' });
                setPreviewAvatar(res.user.avatar || '');
            }
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally { setLoading(false); }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' }); setLoading(false); return;
        }
        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' }); setLoading(false); return;
        }
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            await axios.put('/users/change-password',
                { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
        } finally { setLoading(false); }
    };

    const handleSetup2FA = async () => {
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const res = await axios.post('/2fa/setup', {}, { headers: { Authorization: `Bearer ${token}` } });
            onClose();
            navigate('/setup-2fa', { state: { qrCode: res.data.qrCode, secret: res.data.secret, backupCodes: res.data.backupCodes } });
        } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to setup 2FA' }); }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            const res = await axios.post('/2fa/disable',
                { password: disable2FAForm.password, token: disable2FAForm.token },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                setMessage({ type: 'success', text: '2FA disabled successfully!' });
                setTwoFactorStatus({ enabled: false, backupCodesRemaining: 0 });
                setShowDisable2FA(false);
                setDisable2FAForm({ password: '', token: '' });
            }
        } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to disable 2FA' }); }
        finally { setLoading(false); }
    };

    const handleThemeChange = (newTheme) => {
        setThemeMode(newTheme);
        setMessage({ type: 'success', text: `Theme changed to ${newTheme}` });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    };

    const handleLogout = () => {
        ['token', 'userName', 'userEmail', 'userRole', 'userAvatar', 'userId', 'lastSelectedProjectId']
            .forEach(k => localStorage.removeItem(k));
        onClose();
        navigate('/login');
    };

    const inputCls = "w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

    const tabs = [
        { id: 'profile',    label: 'Profile',    icon: <User className="w-4 h-4" /> },
        { id: 'security',   label: 'Security',   icon: <Shield className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
        { id: 'account',    label: 'Account',    icon: <LogOut className="w-4 h-4" /> },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Manage your account and preferences</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body: sidebar tabs + content */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left tab sidebar */}
                    <div className="w-44 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-3 flex flex-col gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setMessage({ type: '', text: '' }); }}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                                    activeTab === tab.id
                                        ? tab.id === 'account'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right content */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* Message Banner */}
                        {message.text && (
                            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Profile Information</h3>
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    {/* Avatar */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            {previewAvatar
                                                ? <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                                : <span className="text-2xl font-bold text-gray-400">{profileForm.name.charAt(0).toUpperCase() || '?'}</span>
                                            }
                                        </div>
                                        <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                                            Change Avatar
                                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                                        <input type="text" name="name" value={profileForm.name}
                                            onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                            className={inputCls} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                        <input type="email" name="email" value={profileForm.email}
                                            onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                            className={inputCls} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Role</label>
                                        <input type="text" value={profileForm.role}
                                            className={`${inputCls} bg-gray-100 dark:bg-slate-600 cursor-not-allowed opacity-70`} disabled />
                                    </div>
                                    <button type="submit" disabled={loading}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
                                    <form onSubmit={handleSavePassword} className="space-y-3">
                                        {[
                                            { name: 'currentPassword', label: 'Current Password' },
                                            { name: 'newPassword', label: 'New Password' },
                                            { name: 'confirmPassword', label: 'Confirm New Password' },
                                        ].map(f => (
                                            <div key={f.name}>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{f.label}</label>
                                                <input type="password" name={f.name} value={passwordForm[f.name]}
                                                    onChange={(e) => setPasswordForm(p => ({ ...p, [f.name]: e.target.value }))}
                                                    className={inputCls} required />
                                            </div>
                                        ))}
                                        <button type="submit" disabled={loading}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                                            {loading ? 'Changing...' : 'Change Password'}
                                        </button>
                                    </form>
                                </div>

                                <hr className="border-gray-200 dark:border-slate-700" />

                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h3>
                                    {!twoFactorStatus.enabled ? (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Add an extra layer of security to your account.</p>
                                            <button onClick={handleSetup2FA} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">Enable 2FA</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">2FA is enabled</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Backup codes remaining: <strong>{twoFactorStatus.backupCodesRemaining}</strong></p>
                                            <div className="flex gap-2">
                                                <button onClick={() => { onClose(); navigate('/2fa-backup-codes'); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Regenerate Codes</button>
                                                <button onClick={() => setShowDisable2FA(!showDisable2FA)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">Disable 2FA</button>
                                            </div>
                                            {showDisable2FA && (
                                                <form onSubmit={handleDisable2FA} className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg space-y-3">
                                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Confirm Disable 2FA</p>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password</label>
                                                        <input type="password" value={disable2FAForm.password}
                                                            onChange={(e) => setDisable2FAForm(p => ({ ...p, password: e.target.value }))}
                                                            className={inputCls} required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">2FA Token</label>
                                                        <input type="text" value={disable2FAForm.token}
                                                            onChange={(e) => setDisable2FAForm(p => ({ ...p, token: e.target.value }))}
                                                            className={inputCls} placeholder="6-digit code" required />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button type="submit" disabled={loading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                                                            {loading ? 'Disabling...' : 'Confirm'}
                                                        </button>
                                                        <button type="button" onClick={() => setShowDisable2FA(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors">Cancel</button>
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
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Theme</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Choose how BuildWise looks to you</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`p-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-400'}`}
                                    >
                                        <span className="text-3xl">☀️</span>
                                        <span className="font-semibold text-sm text-gray-800 dark:text-white">Light</span>
                                        {theme === 'light' && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active</span>}
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`p-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-400'}`}
                                    >
                                        <span className="text-3xl">🌙</span>
                                        <span className="font-semibold text-sm text-gray-800 dark:text-white">Dark</span>
                                        {theme === 'dark' && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active</span>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Account Tab */}
                        {activeTab === 'account' && (
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Account</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Manage your account session</p>
                                <div className="border border-red-200 dark:border-red-800 rounded-xl p-5 bg-red-50 dark:bg-red-900/20">
                                    <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">Sign Out</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">You will be logged out and redirected to the login page.</p>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;