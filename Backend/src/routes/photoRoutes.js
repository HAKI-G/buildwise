import express from 'express';
import { 
  upload, 
  uploadPhotoForUpdate, 
  getPhotosForUpdate,
  getPhotosForProject,
  getAllPhotos, 
  getPendingPhotos,
  getPendingPhotosForProject,
  confirmAISuggestion,
  deletePhoto 
} from '../controller/photoController.js';
import { validateFileType } from '../middleware/fileValidationMiddleware.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------ PHOTO ROUTES ------------------

// Admin-only routes
router.get('/all/list', protect, requireAdmin, getAllPhotos);
router.get('/pending', protect, requireAdmin, getPendingPhotos);
router.get('/project/:projectId', protect, getPhotosForProject);
router.get('/project/:projectId/pending', protect, requireAdmin, getPendingPhotosForProject);

// Upload photo for a specific update (authenticated users)
router.post(
  '/:updateId',
  protect,                  // ✅ ensures req.user exists
  upload.single('photo'),   
  validateFileType,         // ✅ file type, size, max projects
  uploadPhotoForUpdate
);

// Get photos for a specific update (authenticated)
router.get('/:updateId', protect, getPhotosForUpdate);

// Confirm AI suggestion (authenticated)
router.post('/:photoId/confirm', protect, confirmAISuggestion);

// Delete photo (authenticated)
router.delete('/:photoId', protect, deletePhoto);

export default router;
