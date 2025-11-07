import express from 'express';
import { loginUser, registerUser } from '../controller/userController.js';

const router = express.Router();

// Regular user login
router.post('/register', registerUser);
router.post('/login', loginUser);

// Admin login - uses existing loginUser but adds admin check
router.post('/admin/login', async (req, res) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
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
  
  return loginUser(req, res);
});

export default router;