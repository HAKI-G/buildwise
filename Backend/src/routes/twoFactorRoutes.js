import express from 'express';
import {
  setup2FA,
  verify2FA,
  disable2FA,
  verify2FALogin,
  get2FAStatus,
  regenerateBackupCodes
} from '../controller/twoFactorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/status', protect, get2FAStatus);
router.post('/setup', protect, setup2FA);
router.post('/verify', protect, verify2FA);
router.post('/disable', protect, disable2FA);
router.post('/backup-codes/regenerate', protect, regenerateBackupCodes);

// Public route (for login verification)
router.post('/verify-login', verify2FALogin);

export default router;