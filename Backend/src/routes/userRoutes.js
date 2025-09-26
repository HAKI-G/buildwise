import express from 'express';

// 1. Import all the functions you need from your controller
import { 
    registerUser, 
    loginUser,
    getUserProfile,
    updateUserProfile 
} from '../controller/userController.js';

// 2. Import the protect middleware to secure routes
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---
// Anyone can access these endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- Protected Routes ---
// Only logged-in users with a valid token can access these.
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
