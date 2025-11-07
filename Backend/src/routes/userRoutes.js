import express from 'express';

// Import only what you need
import { 
    getUserProfile,
    updateUserProfile 
} from '../controller/userController.js';

// Import the protect middleware to secure routes
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Protected Routes Only ---
// Only logged-in users with a valid token can access these.
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;