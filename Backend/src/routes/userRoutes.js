import express from 'express';
// 1. Import ALL the functions you need
import { 
    registerUser, 
    loginUser,
    getUserProfile,
    updateUserProfile 
} from '../controller/userController.js';

// 2. Import the protect middleware
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- Protected Routes ---
// The 'protect' middleware will run first. If the token is valid,
// it will then call getUserProfile or updateUserProfile.
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;