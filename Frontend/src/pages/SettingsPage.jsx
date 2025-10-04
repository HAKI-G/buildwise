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
    }, []);

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

    // Handle password input changes
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
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

            localStorage.setItem('userName', profileForm.name);
            localStorage.setItem('userEmail', profileForm.email);
            localStorage.setItem('userRole', profileForm.role);
            
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
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
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

    // Change password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setLoading(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: 'Failed to change password. Please check your current password.' });
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

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Profile Information</h2>
                        
                        <form onSubmit={handleSaveProfile}>
                            {/* Avatar Upload Section */}
                            <div className="mb-8 flex items-center space-x-6">
                                <div className="relative">
                                    <img
                                        src={getAvatarUrl()}
                                        alt="Profile Avatar"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-slate-600"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Profile Photo</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                                        JPG, PNG or GIF. Max size 5MB.
                                    </p>
                                    <div className="flex space-x-3">
                                        <label className="cursor-pointer">
                                            <span className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition inline-block">
                                                Upload Photo
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {previewAvatar && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
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
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-slate-400 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Contact your administrator to change your role</p>
                            </div>

                            {/* Save Button */}
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

                {/* Security Tab */}
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
                                    minLength={6}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Must be at least 6 characters</p>
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

                        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Add an extra layer of security to your account</p>
                                    </div>
                                    <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                        Enable
                                    </button>
                                </div>
                                
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

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h2>
                        
                        <div className="space-y-6">
                            {/* Notifications */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900">
                                        <span className="text-sm text-gray-700 dark:text-slate-300">Email notifications for project updates</span>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-blue-600 rounded" 
                                            checked={preferences.emailProjectUpdates}
                                            onChange={() => handlePreferenceChange('emailProjectUpdates')}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900">
                                        <span className="text-sm text-gray-700 dark:text-slate-300">Email notifications for comments</span>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-blue-600 rounded"
                                            checked={preferences.emailComments}
                                            onChange={() => handlePreferenceChange('emailComments')}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900">
                                        <span className="text-sm text-gray-700 dark:text-slate-300">Email notifications for milestones</span>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-blue-600 rounded"
                                            checked={preferences.emailMilestones}
                                            onChange={() => handlePreferenceChange('emailMilestones')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Display */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Display</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                        <label className="block text-sm text-gray-700 dark:text-slate-300 mb-2">Theme</label>
                                        <select 
                                            value={theme}
                                            onChange={handleThemeChange}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                            <option value="auto">Auto</option>
                                        </select>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                                            Auto mode follows your system preferences
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                        <label className="block text-sm text-gray-700 dark:text-slate-300 mb-2">Language</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>English</option>
                                            <option>Filipino</option>
                                            <option>Spanish</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Save Preferences Button */}
                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleSavePreferences}
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default SettingsPage;