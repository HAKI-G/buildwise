import express from 'express';
import { 
    getUserProfile,
    updateUserProfile,
    getAllUsers
} from '../controller/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users/all — all registered users (for dashboard team display)
router.get('/all', protect, getAllUsers);

// GET /api/users/profile — current logged-in user's profile
// PUT /api/users/profile — update current logged-in user's profile
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;