import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = form, 2 = verification
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // STEP 1: Submit registration form
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/registration/initiate', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'Project Manager'
      });

      setSuccess(response.data.message);
      setStep(2); // Move to verification step
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify email code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/api/registration/verify', {
        email: formData.email,
        code: verificationCode
      });

      // Save token and user info
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userId', user.userId);

      setSuccess('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/api/registration/resend-code', {
        email: formData.email
      });

      setSuccess(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-blue-900"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h30v30H0V0zm30 30h30v30H30V30z\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundSize: '30px 30px'
      }}
    >
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">
                Create Account
              </h2>
              <p className="text-gray-600 mt-2">Join BuildWise today</p>
            </div>
            
            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="John Doe"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="you@example.com"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending Code...' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: Email Verification */}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Verify Your Email
              </h2>
              <p className="text-gray-600">
                We sent a 6-digit code to
              </p>
              <p className="text-blue-600 font-semibold">{formData.email}</p>
            </div>

            <form onSubmit={handleVerifyCode}>
              <div className="mb-6">
                <label htmlFor="verificationCode" className="block mb-2 text-sm font-bold text-gray-700 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-center text-3xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="000000"
                  autoFocus
                />
                <p className="text-xs text-gray-600 text-center mt-2">
                  Check your email inbox
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed mb-3"
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:underline font-medium disabled:text-gray-400"
                >
                  Didn't receive code? Resend
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setVerificationCode('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full mt-3 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300"
              >
                ← Change Email
              </button>
            </form>
          </>
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

        {/* Login Link */}
        {step === 1 && (
          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Login here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;