    import React, { useState } from 'react';
    import axios from 'axios';
    import { useNavigate, Link } from 'react-router-dom';

    function LoginPage() {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      
      // ✅ Add 2FA state
      const [requires2FA, setRequires2FA] = useState(false);
      const [twoFactorCode, setTwoFactorCode] = useState('');
      const [tempEmail, setTempEmail] = useState('');
      
      const navigate = useNavigate();

      const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
          const response = await axios.post('http://localhost:5001/api/auth/login', {
            email,
            password,
            twoFactorCode: requires2FA ? twoFactorCode : undefined // ✅ Include 2FA code if needed
          });

          console.log('Login response:', response.data);

          // ✅ Check if 2FA is required
          if (response.data.requires2FA) {
            setRequires2FA(true);
            setTempEmail(email);
            setIsLoading(false);
            return;
          }

          const { token, user } = response.data;
          
          localStorage.setItem('token', token);

          // ✅ Save complete user object
          localStorage.setItem('user', JSON.stringify(user));
          
          if (user) {
            localStorage.setItem('userName', user.name || user.username || 'User');
            localStorage.setItem('userEmail', user.email || email);
            localStorage.setItem('userRole', user.role || 'User');
            localStorage.setItem('userAvatar', user.avatar || user.profilePicture || '');
            localStorage.setItem('userId', user.userId || '');
          } else {
            localStorage.setItem('userName', email.split('@')[0]);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', 'User');
            localStorage.setItem('userAvatar', '');
          }

          navigate('/dashboard');

        } catch (err) {
          const message = err.response 
            ? err.response.data.message 
            : 'Login failed. Please check credentials or server status.';
          setError(message);
          console.error('Login error:', err.response ? err.response.data : err.message);
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <div 
          className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h30v30H0V0zm30 30h30v30H30V30z\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '30px 30px'
          }}
        >
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
              BuildWise Login
            </h2>
            
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label htmlFor="email" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || requires2FA}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="you@example.com"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || requires2FA}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="••••••••"
                />
              </div>
            <div className="text-right mb-4">
                  <Link 
                     to="/forgot-password" 
                      className="text-sm text-blue-600 hover:underline font-medium"
                 >
                   Forgot Password?
                </Link>
            </div>
              {/* ✅ 2FA Code Input */}
              {requires2FA && (
                <div className="mb-6">
                  <label htmlFor="twoFactorCode" className="block mb-2 text-sm font-bold text-gray-700 text-left">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    id="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="000000"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-600 text-center">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : requires2FA ? 'Verify & Login' : 'Login'}
              </button>

              {/* ✅ Back button when 2FA is shown */}
              {requires2FA && (
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode('');
                    setPassword('');
                  }}
                  className="w-full mt-3 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300"
                >
                  Back to Login
                </button>
              )}
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-center text-sm">{error}</p>
              </div>
            )}

            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      );
    }

    export default LoginPage;