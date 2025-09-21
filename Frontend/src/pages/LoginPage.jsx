import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5001/api/users/login', {
        email,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('token', token);
      navigate('/dashboard');

    } catch (err) {
      const message = err.response ? err.response.data.message : 'Login failed. Please check credentials or server status.';
      setError(message);
      console.error('Login error:', err.response ? err.response.data : err.message);
    }
  };

  return (
    // --- THIS IS THE UPDATED PART FOR THE BACKGROUND ---
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h30v30H0V0zm30 30h30v30H30V30z\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundSize: '30px 30px'
      }}
    >
      
      {/* The login card */}
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          BuildWise Login
        </h2>
        
        <form onSubmit={handleLogin}>
          
          {/* Email Input */}
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Password Input */}
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Login
          </button>
        </form>

        {/* Display error message if it exists */}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        {/* Link to Register Page */}
        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}

export default LoginPage;