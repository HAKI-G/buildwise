export const auth = {
  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem('adminToken');
  },

  // Set token in localStorage
  setToken: (token) => {
    localStorage.setItem('adminToken', token);
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('adminToken');
    return !!token;
  },

  // Get user data from localStorage
  getUser: () => {
    try {
      const userStr = localStorage.getItem('adminUser');
      // ✅ FIX: Check if userStr exists before parsing
      if (!userStr || userStr === 'undefined') {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  // Set user data in localStorage
  setUser: (user) => {
    if (user) {
      localStorage.setItem('adminUser', JSON.stringify(user));
    }
  },

  // Logout - clear all auth data
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
  }
};

export default auth;