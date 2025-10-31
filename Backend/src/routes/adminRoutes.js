import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAllUsersAdmin,
  getUserByIdAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin
} from '../controller/adminController.js';
import { 
  getAuditLogs,
  getAuditLogsByUser,
  archiveLog,
  unarchiveLog,
  bulkArchiveLogs
} from '../controller/auditController.js';

const router = express.Router();

// Apply authentication to ALL routes
router.use(protect);
// Uncomment this if you want ALL admin routes to require admin role
// router.use(requireAdmin);

// ==========================================
// Admin user management routes
// ==========================================
router.get('/users', getAllUsersAdmin);
router.get('/users/:userId', getUserByIdAdmin);
router.post('/users', createUserAdmin);
router.put('/users/:userId', updateUserAdmin);
router.delete('/users/:userId', deleteUserAdmin);

// ==========================================
// ✅ Admin audit log routes (GET)
// ==========================================
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/user/:userId', getAuditLogsByUser);

// ==========================================
// ✅ Admin audit log routes (ARCHIVE)
// ==========================================
router.post('/audit-logs/archive', archiveLog);
router.post('/audit-logs/unarchive', unarchiveLog);
router.post('/audit-logs/bulk-archive', bulkArchiveLogs);

export default router;