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

// ==================== PHOTO ROUTES ====================
// All routes use authentication middleware (protect)
// This ensures only logged-in users can access these endpoints

// --- Admin-only Routes ---
// Get all photos across all projects (admin dashboard)
router.get('/all/list', protect, requireAdmin, getAllPhotos);

// Get all pending photos across all projects (admin review)
router.get('/pending', protect, requireAdmin, getPendingPhotos);

// --- Project-Specific Routes ---
// Get ALL photos for a specific project (both pending and confirmed)
router.get('/project/:projectId', protect, getPhotosForProject);

// Get ONLY pending photos for a specific project (admin review)
router.get('/project/:projectId/pending', protect, requireAdmin, getPendingPhotosForProject);

// --- Upload Route ---
// Upload photo for a specific update (with AI analysis)
// This route connects to your EC2 AI server at 18.141.56.204:5000
router.post(
  '/:updateId',
  protect,                      // ✅ Authentication required
  upload.single('photo'),       // ✅ Multer handles file upload to S3
  validateFileType,             // ✅ Validates file type and size
  uploadPhotoForUpdate          // ✅ Sends photo to AI on EC2, saves to DynamoDB
);

// --- Photo Management Routes ---
// Get photos for a specific update ID
router.get('/:updateId', protect, getPhotosForUpdate);

// Confirm AI suggestion (approve/reject photo)
// This route sends confirmation back to EC2 AI for calculation
router.post('/:photoId/confirm', protect, confirmAISuggestion);

// Delete photo (removes from S3 and DynamoDB)
router.delete('/:photoId', protect, deletePhoto);

export default router;