import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import Layout from '../components/Layout';

const getToken = () => localStorage.getItem('token');

function SettingsPage() {
    const navigate = useNavigate();
    const { theme, setThemeMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('profile');
    
    // ✅ ADD 2FA STATE
    const [twoFactorStatus, setTwoFactorStatus] = useState({
        enabled: false,
        backupCodesRemaining: 0
    });
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [disable2FAForm, setDisable2FAForm] = useState({
        password: '',
        token: ''
    });
    
    // Profile form state
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        role: '',
        avatar: ''
    });
    
    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // ✅ Password validation state
    const [passwordValidation, setPasswordValidation] = useState({
        length: false,
        uppercase: false,
        number: false,
        special: false
    });
    
    // Preferences state
    const [preferences, setPreferences] = useState({
        emailProjectUpdates: true,
        emailComments: false,
        emailMilestones: true
    });
    
    // Avatar upload
    const [previewAvatar, setPreviewAvatar] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);

    // Load user data on mount
    useEffect(() => {
        loadUserProfile();
        loadPreferences();
        load2FAStatus(); // ✅ Load 2FA status
    }, []);

    // ✅ LOAD 2FA STATUS
    const load2FAStatus = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await axios.get('http://localhost:5001/api/2fa/status', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTwoFactorStatus(response.data);
        } catch (error) {
            console.error('Error loading 2FA status:', error);
        }
    };

    const loadUserProfile = () => {
        const userName = localStorage.getItem('userName') || '';
        const userEmail = localStorage.getItem('userEmail') || '';
        const userRole = localStorage.getItem('userRole') || '';
        const userAvatar = localStorage.getItem('userAvatar') || '';
        
        setProfileForm({
            name: userName,
            email: userEmail,
            role: userRole,
            avatar: userAvatar
        });
        setPreviewAvatar(userAvatar);
    };

    const loadPreferences = () => {
        const savedPrefs = localStorage.getItem('userPreferences');
        if (savedPrefs) {
            setPreferences(JSON.parse(savedPrefs));
        }
    };

    // Handle theme change
    const handleThemeChange = (e) => {
        setThemeMode(e.target.value);
    };

    // Handle preference checkboxes
    const handlePreferenceChange = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Handle profile input changes
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ✅ Handle password input changes with validation
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));

        // Validate new password in real-time
        if (name === 'newPassword') {
            setPasswordValidation({
                length: value.length >= 8,
                uppercase: /[A-Z]/.test(value),
                number: /\d/.test(value),
                special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
            });
        }
    };

    // Handle avatar file selection
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Please select an image file' });
                return;
            }
            
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewAvatar(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove avatar
    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setPreviewAvatar('');
        setProfileForm(prev => ({ ...prev, avatar: '' }));
    };

    // Save profile changes
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            // ✅ SEND TO BACKEND
            await axios.put(
                'http://localhost:5001/api/users/profile',
                {
                    name: profileForm.name,
                    email: profileForm.email,
                    avatar: previewAvatar
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            localStorage.setItem('userName', profileForm.name);
            localStorage.setItem('userEmail', profileForm.email);
            
            if (previewAvatar) {
                localStorage.setItem('userAvatar', previewAvatar);
            } else {
                localStorage.removeItem('userAvatar');
            }

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    // Save preferences
    const handleSavePreferences = () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            localStorage.setItem('theme', theme);
            
            setMessage({ type: 'success', text: 'Preferences saved successfully!' });
            
            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error('Error saving preferences:', error);
            setMessage({ type: 'error', text: 'Failed to save preferences.' });
        } finally {
            setLoading(false);
        }
    };

    // ✅ CHANGE PASSWORD WITH VALIDATION
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setLoading(false);
            return;
        }

        // Check if all validations pass
        const isValid = Object.values(passwordValidation).every(v => v === true);
        if (!isValid) {
            setMessage({ type: 'error', text: 'Password does not meet security requirements' });
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            await axios.put(
                'http://localhost:5001/api/users/profile',
                {
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordValidation({
                length: false,
                uppercase: false,
                number: false,
                special: false
            });
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password. Please check your current password.' });
        } finally {
            setLoading(false);
        }
    };

    // ✅ ENABLE 2FA - Navigate to setup page
    const handleEnable2FA = () => {
        navigate('/setup-2fa');
    };

    // ✅ DISABLE 2FA
    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            await axios.post(
                'http://localhost:5001/api/2fa/disable',
                {
                    password: disable2FAForm.password,
                    token: disable2FAForm.token
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage({ type: 'success', text: '2FA has been disabled successfully' });
            setShowDisable2FA(false);
            setDisable2FAForm({ password: '', token: '' });
            
            // Reload 2FA status
            await load2FAStatus();
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to disable 2FA' });
        } finally {
            setLoading(false);
        }
    };

    const getAvatarUrl = () => {
        if (previewAvatar) {
            return previewAvatar;
        }
        const name = profileForm.name || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=200&bold=true`;
    };

    return (
        <Layout title="Settings">
            <div className="max-w-4xl mx-auto">
                {/* Tabs */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6 transition-colors">
                    <div className="flex border-b border-gray-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                                activeTab === 'profile'
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Profile Information
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                                activeTab === 'security'
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                                activeTab === 'preferences'
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Preferences
                        </button>
                    </div>
                </div>

                {/* Message Alert */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg transition-colors ${
                        message.type === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                            : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}>
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                {/* ✅ PROFILE TAB - COMPLETE IMPLEMENTATION */}
                {activeTab === 'profile' && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Profile Information</h2>
                        
                        <form onSubmit={handleSaveProfile}>
                            {/* Avatar Section */}
                            <div className="mb-6 flex items-center gap-6">
                                <div className="relative">
                                    <img
                                        src={getAvatarUrl()}
                                        alt="Profile Avatar"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-slate-600"
                                    />
                                    {previewAvatar && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveAvatar}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                                            title="Remove avatar"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="block">
                                        <span className="sr-only">Choose profile photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="block w-full text-sm text-gray-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-lg file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100
                                                dark:file:bg-blue-900/30 dark:file:text-blue-400
                                                dark:hover:file:bg-blue-900/50"
                                        />
                                    </label>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                                        JPG, PNG or GIF (MAX. 5MB)
                                    </p>
                                </div>
                            </div>

                            {/* Name Field */}
                            <div className="mb-6">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={profileForm.name}
                                    onChange={handleProfileChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email Field */}
                            <div className="mb-6">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profileForm.email}
                                    onChange={handleProfileChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Role Field (Read-only) */}
                            <div className="mb-6">
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Role
                                </label>
                                <input
                                    type="text"
                                    id="role"
                                    name="role"
                                    value={profileForm.role}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-slate-400 cursor-not-allowed"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Contact an administrator to change your role
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ✅ SECURITY TAB - COMPLETE IMPLEMENTATION */}
                {activeTab === 'security' && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Change Password</h2>
                        
                        <form onSubmit={handleChangePassword}>
                            <div className="mb-6">
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                
                                {/* ✅ PASSWORD REQUIREMENTS */}
                                {passwordForm.newPassword && (
                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Password must contain:</p>
                                        <ul className="space-y-1">
                                            <li className={`text-xs flex items-center gap-2 ${passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                                <span>{passwordValidation.length ? '✓' : '○'}</span>
                                                <span>At least 8 characters</span>
                                            </li>
                                            <li className={`text-xs flex items-center gap-2 ${passwordValidation.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                                <span>{passwordValidation.uppercase ? '✓' : '○'}</span>
                                                <span>One uppercase letter (A-Z)</span>
                                            </li>
                                            <li className={`text-xs flex items-center gap-2 ${passwordValidation.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                                <span>{passwordValidation.number ? '✓' : '○'}</span>
                                                <span>One number (0-9)</span>
                                            </li>
                                            <li className={`text-xs flex items-center gap-2 ${passwordValidation.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                                <span>{passwordValidation.special ? '✓' : '○'}</span>
                                                <span>One special character (!@#$%^&*)</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>

                        {/* ✅ ACCOUNT ACTIONS - 2FA SECTION */}
                        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h3>
                            <div className="space-y-4">
                                {/* ✅ TWO-FACTOR AUTHENTICATION */}
                                <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Two-Factor Authentication
                                                </h4>
                                                {twoFactorStatus.enabled && (
                                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded">
                                                        Enabled
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                                                Add an extra layer of security to your account
                                            </p>
                                            {twoFactorStatus.enabled && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                                    {twoFactorStatus.backupCodesRemaining} backup codes remaining
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {!twoFactorStatus.enabled ? (
                                                <button 
                                                    onClick={handleEnable2FA}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                                                >
                                                    Enable
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setShowDisable2FA(!showDisable2FA)}
                                                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                >
                                                    Disable
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* ✅ DISABLE 2FA FORM */}
                                    {showDisable2FA && twoFactorStatus.enabled && (
                                        <form onSubmit={handleDisable2FA} className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                                    Confirm Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={disable2FAForm.password}
                                                    onChange={(e) => setDisable2FAForm({ ...disable2FAForm, password: e.target.value })}
                                                    required
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    placeholder="Enter your password"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                                    2FA Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={disable2FAForm.token}
                                                    onChange={(e) => setDisable2FAForm({ ...disable2FAForm, token: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                                    maxLength="6"
                                                    required
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    placeholder="Enter 6-digit code"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition"
                                                >
                                                    {loading ? 'Disabling...' : 'Confirm Disable'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowDisable2FA(false);
                                                        setDisable2FAForm({ password: '', token: '' });
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                              </form>
                                    )}
                                </div>
                                
                                {/* DELETE ACCOUNT */}
                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div>
                                        <h4 className="text-sm font-medium text-red-900 dark:text-red-300">Delete Account</h4>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Permanently delete your account and all data</p>
                                    </div>
                                    <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ PREFERENCES TAB - COMPLETE IMPLEMENTATION */}
                {activeTab === 'preferences' && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h2>
                        
                        {/* Theme Settings */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <input
                                        type="radio"
                                        name="theme"
                                        value="light"
                                        checked={theme === 'light'}
                                        onChange={handleThemeChange}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">Light Mode</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Use light theme</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-white border-2 border-gray-300"></div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <input
                                        type="radio"
                                        name="theme"
                                        value="dark"
                                        checked={theme === 'dark'}
                                        onChange={handleThemeChange}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">Dark Mode</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Use dark theme</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 border-2 border-slate-600"></div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <input
                                        type="radio"
                                        name="theme"
                                        value="system"
                                        checked={theme === 'system'}
                                        onChange={handleThemeChange}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">System Default</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Follow system preference</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-white to-slate-800 border-2 border-gray-300"></div>
                                </label>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">Project Updates</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Receive emails about project changes</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailProjectUpdates}
                                        onChange={() => handlePreferenceChange('emailProjectUpdates')}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">Comments</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Get notified when someone comments</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailComments}
                                        onChange={() => handlePreferenceChange('emailComments')}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">Milestones</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">Milestone completion notifications</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailMilestones}
                                        onChange={() => handlePreferenceChange('emailMilestones')}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-700">
                            <button
                                onClick={handleSavePreferences}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default SettingsPage;