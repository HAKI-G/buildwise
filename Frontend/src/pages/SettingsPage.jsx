import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const getToken = () => localStorage.getItem('token');

function SettingsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const navigate = useNavigate();

    // Fetch the current user's profile data when the page loads
    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = getToken();
            if (!token) { navigate('/login'); return; }

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                // This is a new backend endpoint we will create
                const { data } = await axios.get('http://localhost:5001/api/users/profile', config);
                setName(data.name);
                setEmail(data.email);
            } catch (err) {
                setError('Could not fetch user profile.');
            }
        };
        fetchUserProfile();
    }, [navigate]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSuccess('');
        setError('');
        const token = getToken();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // This is a new backend endpoint we will create
            await axios.put('http://localhost:5001/api/users/profile', { name, email }, config);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setSuccess('');
        setError('');
        const token = getToken();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
             // This is a new backend endpoint we will create
            await axios.put('http://localhost:5001/api/users/change-password', { currentPassword, newPassword }, config);
            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password.');
        }
    };

    return (
        <Layout title="Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Information Form */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition">Save Changes</button>
                        </div>
                    </form>
                </div>

                {/* Change Password Form */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                            <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                         <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition">Change Password</button>
                        </div>
                    </form>
                </div>
            </div>
            {success && <p className="mt-6 text-center text-green-600 font-semibold">{success}</p>}
            {error && <p className="mt-6 text-center text-red-600 font-semibold">{error}</p>}
        </Layout>
    );
}

export default SettingsPage;