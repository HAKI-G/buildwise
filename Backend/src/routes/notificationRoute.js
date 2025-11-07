import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead
} from '../controller/notificationController.js';
import { sendNotification } from '../controller/notificationController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// User routes
router.get('/', getNotifications);
router.put('/read', markAsRead);
router.put('/read-all', markAllAsRead);

//Notification For the user
router.post('/send', async (req, res) => {
  try {
    const { type, title, message, metadata, specificUserId } = req.body;
    await sendNotification(type, title, message, metadata, specificUserId);
    res.status(200).json({ message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification' });
  }
});

export default router;