import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Using similar styling to the LoginPage for consistency
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: 'sans-serif',
    backgroundColor: '#f4f7f9',
  },
  card: {
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '30px',
    color: '#333',
  },
  formGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#28a745', // Green for register
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
  },
  message: {
    marginTop: '20px',
    fontSize: '14px',
  },
  error: {
    color: 'red',
  },
  loginLink: {
    marginTop: '20px',
    color: '#007bff',
    textDecoration: 'none',
  },
};

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // In frontend/src/pages/RegisterPage.jsx

const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // The backend now sends back a response with a token
      const response = await axios.post('http://localhost:5001/api/users/register', {
        name,
        email,
        password,
        role: 'Project Manager',
      });

      // On success, get the token
      const { token } = response.data;
      
      // Save the token to automatically log the user in
      localStorage.setItem('token', token);
      
      // Redirect directly to the dashboard
      navigate('/dashboard');

    } catch (err) {
      // --- FIX #3: SHOW THE REAL ERROR MESSAGE ---
      // Display the actual error message sent from the backend
      const message = err.response ? err.response.data.message : 'Registration failed. Please try again.';
      setError(message);
      console.error('Registration error:', err.response ? err.response.data : err.message);
    }
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Your BuildWise Account</h2>
        <form onSubmit={handleRegister}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g., Juan dela Cruz"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g., j.delacruz@example.com"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Choose a secure password"
            />
          </div>
          <button type="submit" style={styles.button}>Register</button>
        </form>
        {error && <p style={{ ...styles.message, ...styles.error }}>{error}</p>}
        {success && <p style={{ ...styles.message, color: 'green' }}>{success}</p>}
        <p style={styles.message}>
          Already have an account? <Link to="/login" style={styles.loginLink}>Log in here</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;