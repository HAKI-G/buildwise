import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAdminDashboardStats,
  getAdminRecentActivity,
  getAdminSystemStatus
} from '../controller/adminDashboardController.js';

const router = express.Router();

// Apply authentication and admin role to ALL dashboard routes
router.use(protect);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics (users, projects, trends)
 * @access  Private/Admin
 */
router.get('/stats', getAdminDashboardStats);

/**
 * @route   GET /api/admin/dashboard/recent-activity
 * @desc    Get recent activity feed for admin
 * @access  Private/Admin
 */
router.get('/recent-activity', getAdminRecentActivity);

/**
 * @route   GET /api/admin/dashboard/system-status
 * @desc    Get system health metrics for admin
 * @access  Private/Admin
 */
router.get('/system-status', getAdminSystemStatus);

export default router;