import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAllUsersAdmin,
  getUserByIdAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin
} from '../controller/adminController.js';

const router = express.Router();

// Apply authentication and admin check to ALL routes
router.use(protect);
router.use(requireAdmin);

// Admin user management routes
router.get('/users', getAllUsersAdmin);
router.get('/users/:userId', getUserByIdAdmin);
router.post('/users', createUserAdmin);
router.put('/users/:userId', updateUserAdmin);
router.delete('/users/:userId', deleteUserAdmin);

export default router;