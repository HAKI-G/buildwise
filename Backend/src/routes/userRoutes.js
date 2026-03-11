import express from 'express';
import multer from 'multer';

// Import only what you need
import { 
    getUserProfile,
    updateUserProfile,
    uploadAvatar
} from '../controller/userController.js';

// Import the protect middleware to secure routes
import { protect } from '../middleware/authMiddleware.js';

// Multer config for avatar upload (memory storage → S3)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const router = express.Router();

// --- Protected Routes Only ---
// Only logged-in users with a valid token can access these.
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Avatar upload endpoint
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

export default router;