import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // STEP 1: Request verification code
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await axios.post('http://localhost:5001/api/forgot-password/request', { email });
            
            setSuccess('Verification code sent to your email!');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setIsLoading(false);
        }
    };

    // STEP 2: Verify code
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await axios.post('http://localhost:5001/api/forgot-password/verify-code', {
                email,
                code
            });
            
            setSuccess('Code verified! Now set your new password.');
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    // STEP 3: Reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            await axios.post('http://localhost:5001/api/forgot-password/reset', {
                email,
                code,
                newPassword
            });
            
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-900"
            style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h30v30H0V0zm30 30h30v30H30V30z\'/%3E%3C/g%3E%3C/svg%3E")',
                backgroundSize: '30px 30px'
            }}
        >
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">
                        {step === 1 && 'Forgot Password'}
                        {step === 2 && 'Verify Code'}
                        {step === 3 && 'New Password'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {step === 1 && 'Enter your email to receive a verification code'}
                        {step === 2 && 'Check your email for the 6-digit code'}
                        {step === 3 && 'Enter your new password'}
                    </p>
                </div>

                {/* STEP 1: Enter Email */}
                {step === 1 && (
                    <form onSubmit={handleRequestCode}>
                        <div className="mb-6">
                            <label htmlFor="email" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                placeholder="you@example.com"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {/* STEP 2: Enter Verification Code */}
                {step === 2 && (
                    <form onSubmit={handleVerifyCode}>
                        <div className="mb-6">
                            <label htmlFor="code" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                id="code"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength="6"
                                required
                                disabled={isLoading}
                                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                placeholder="000000"
                                autoFocus
                            />
                            <p className="mt-2 text-xs text-gray-600 text-center">
                                Enter the 6-digit code sent to {email}
                            </p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || code.length !== 6}
                            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verifying...' : 'Verify Code'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setCode('');
                                setError('');
                            }}
                            className="w-full mt-3 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300"
                        >
                            ← Back
                        </button>
                    </form>
                )}

                {/* STEP 3: Enter New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-4">
                            <label htmlFor="newPassword" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={isLoading}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-center text-sm">{success}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-center text-sm">{error}</p>
                    </div>
                )}

                <p className="text-center text-gray-600 mt-6">
                    Remember your password?{' '}
                    <Link to="/login" className="text-purple-600 hover:underline font-medium">
                        Back to Login
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;