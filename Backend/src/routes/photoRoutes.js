import express from 'express';
import { upload, uploadPhotoForUpdate, getPhotosForUpdate, getAllPhotos, deletePhoto } from '../controller/photoController.js';

const router = express.Router();

router.get('/all/list', getAllPhotos);
router.post('/:updateId', upload.single('photo'), uploadPhotoForUpdate);
router.get('/:updateId', getPhotosForUpdate);
router.delete('/:photoId', deletePhoto);

export default router;