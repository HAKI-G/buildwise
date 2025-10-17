import express from 'express';
import { 
    upload, 
    uploadPhotoForUpdate, 
    getPhotosForUpdate, 
    getAllPhotos, 
    getPendingPhotos,
    confirmAISuggestion,
    deletePhoto 
} from '../controller/photoController.js';

const router = express.Router();

router.get('/all/list', getAllPhotos);
router.get('/pending', getPendingPhotos); // NEW: Get photos needing confirmation
router.post('/:updateId', upload.single('photo'), uploadPhotoForUpdate);
router.get('/:updateId', getPhotosForUpdate);
router.post('/:photoId/confirm', confirmAISuggestion); // NEW: Confirm AI suggestion
router.delete('/:photoId', deletePhoto);

export default router;