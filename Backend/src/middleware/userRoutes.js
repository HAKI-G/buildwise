import express from 'express';
import { 
    getAllUsers, 
    getUserProfile, 
    updateUserProfile,
    registerUser,
    loginUser
} from '../controller/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication needed)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (authentication required)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/', protect, getAllUsers);

export default router;
