import express from 'express';
import { 
    upload, 
    uploadPhotoForUpdate, 
    getPhotosForUpdate,
    getPhotosForProject,  // ✅ NEW: Get photos for specific project
    getAllPhotos, 
    getPendingPhotos,
    getPendingPhotosForProject,  // ✅ NEW: Get pending photos for specific project
    confirmAISuggestion,
    deletePhoto 
} from '../controller/photoController.js';

const router = express.Router();

// Get all photos (admin use)
router.get('/all/list', getAllPhotos);

// Get ALL pending photos (admin use)
router.get('/pending', getPendingPhotos);

// ✅ NEW: Get all photos for a specific project
router.get('/project/:projectId', getPhotosForProject);

// ✅ NEW: Get pending photos for a specific project
router.get('/project/:projectId/pending', getPendingPhotosForProject);

// Upload photo for a specific update (now includes projectId in body)
router.post('/:updateId', upload.single('photo'), uploadPhotoForUpdate);

// Get photos for a specific update
router.get('/:updateId', getPhotosForUpdate);

// Confirm AI suggestion
router.post('/:photoId/confirm', confirmAISuggestion);

// Delete photo
router.delete('/:photoId', deletePhoto);

export default router;