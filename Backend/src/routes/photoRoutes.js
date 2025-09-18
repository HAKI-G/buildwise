import express from 'express';
import { upload, uploadPhotoForUpdate, getPhotosForUpdate } from '../controller/photoController.js';

const router = express.Router();

// Route to upload a single photo for a progress update.
// The upload.single('photo') is special middleware that processes the file upload FIRST.
// The string 'photo' must match the key name you use in Postman.
router.post('/:updateId', upload.single('photo'), uploadPhotoForUpdate);


// Route to get all photos for a specific progress update
router.get('/:updateId', getPhotosForUpdate);

export default router;