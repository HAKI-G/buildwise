// Authentication utility functions

export const auth = {
  // Store token
  setToken: (token) => {
    localStorage.setItem('adminToken', token);
  },

  // Get token
  getToken: () => {
    return localStorage.getItem('adminToken');
  },

  // Remove token
  removeToken: () => {
    localStorage.removeItem('adminToken');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },

  // Store user info
  setUser: (user) => {
    localStorage.setItem('adminUser', JSON.stringify(user));
  },

  // Get user info
  getUser: () => {
    const user = localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },
};

export default auth;