import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const getToken = () => localStorage.getItem('token');

function SettingsPage() {
    const navigate = useNavigate();
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
    
    // Avatar upload
    const [previewAvatar, setPreviewAvatar] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);

    // Load user data on mount
    useEffect(() => {
        loadUserProfile();
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
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

            // Update localStorage
            localStorage.setItem('userName', profileForm.name);
            localStorage.setItem('userEmail', profileForm.email);
            localStorage.setItem('userRole', profileForm.role);
            
            if (previewAvatar) {
                localStorage.setItem('userAvatar', previewAvatar);
            } else {
                localStorage.removeItem('userAvatar');
            }

            // You can also call your backend API here
            // const config = { headers: { Authorization: `Bearer ${token}` } };
            // await axios.put('http://localhost:5001/api/users/profile', profileForm, config);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            
            // Reload the page to reflect changes in header
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

            // Call your backend API here
            // const config = { headers: { Authorization: `Bearer ${token}` } };
            // await axios.put('http://localhost:5001/api/users/change-password', {
            //     currentPassword: passwordForm.currentPassword,
            //     newPassword: passwordForm.newPassword
            // }, config);

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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 px-6 py-4 text-sm font-medium ${
                                activeTab === 'profile'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Profile Information
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex-1 px-6 py-4 text-sm font-medium ${
                                activeTab === 'security'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`flex-1 px-6 py-4 text-sm font-medium ${
                                activeTab === 'preferences'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Preferences
                        </button>
                    </div>
                </div>

                {/* Message Alert */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        message.type === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-800' 
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                        
                        <form onSubmit={handleSaveProfile}>
                            {/* Avatar Upload Section */}
                            <div className="mb-8 flex items-center space-x-6">
                                <div className="relative">
                                    <img
                                        src={getAvatarUrl()}
                                        alt="Profile Avatar"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Profile Photo</h3>
                                    <p className="text-xs text-gray-500 mb-3">
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
                                                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Name Field */}
                            <div className="mb-6">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={profileForm.name}
                                    onChange={handleProfileChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email Field */}
                            <div className="mb-6">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profileForm.email}
                                    onChange={handleProfileChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Role Field (Read-only) */}
                            <div className="mb-6">
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                                    Role
                                </label>
                                <input
                                    type="text"
                                    id="role"
                                    name="role"
                                    value={profileForm.role}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Contact your administrator to change your role</p>
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
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Change Password</h2>
                        
                        <form onSubmit={handleChangePassword}>
                            {/* Current Password */}
                            <div className="mb-6">
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* New Password */}
                            <div className="mb-6">
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                            </div>

                            {/* Confirm Password */}
                            <div className="mb-6">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Change Password Button */}
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

                        {/* Account Actions */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                                        <p className="text-xs text-gray-500 mt-1">Add an extra layer of security to your account</p>
                                    </div>
                                    <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                                        Enable
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                                    <div>
                                        <h4 className="text-sm font-medium text-red-900">Delete Account</h4>
                                        <p className="text-xs text-red-600 mt-1">Permanently delete your account and all data</p>
                                    </div>
                                    <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Preferences</h2>
                        
                        <div className="space-y-6">
                            {/* Notifications */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Notifications</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <span className="text-sm text-gray-700">Email notifications for project updates</span>
                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" defaultChecked />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <span className="text-sm text-gray-700">Email notifications for comments</span>
                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                                    </label>
                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <span className="text-sm text-gray-700">Email notifications for milestones</span>
                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" defaultChecked />
                                    </label>
                                </div>
                            </div>

                            {/* Display */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Display</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <label className="block text-sm text-gray-700 mb-2">Theme</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Light</option>
                                            <option>Dark</option>
                                            <option>Auto</option>
                                        </select>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <label className="block text-sm text-gray-700 mb-2">Language</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>English</option>
                                            <option>Filipino</option>
                                            <option>Spanish</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Save Preferences Button */}
                            <div className="flex justify-end pt-4">
                                <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                                    Save Preferences
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