import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAllSettings,
  getSettingsByCategory,
  updateSettings,
  getAdminProfile,
  updateAdminProfile,
  resetSettings
} from '../controller/settingsController.js';

const router = express.Router();

// Apply authentication and admin check to ALL routes
router.use(protect);
router.use(requireAdmin);

// Settings routes
router.get('/', getAllSettings);
router.get('/:category', getSettingsByCategory);
router.put('/:category', updateSettings);
router.post('/:category/reset', resetSettings);

// Profile routes
router.get('/profile/me', getAdminProfile);
router.put('/profile/me', updateAdminProfile);

export default router;




















