import express from 'express';
import { loginUser } from '../controller/userController.js';

const router = express.Router();

// Admin login - uses existing loginUser but adds admin check
router.post('/admin/login', async (req, res) => {
  // Create a custom response interceptor
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Check if login was successful and user is admin
    if (data.token && data.user) {
      if (data.user.role !== 'Admin') {
        return originalJson({
          error: 'Access denied. Admin access only.',
          message: 'This login is for administrators only.'
        });
      }
    }
    return originalJson(data);
  };
  
  // Call existing login function
  return loginUser(req, res);
});

export default router;