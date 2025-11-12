import express from 'express';
import multer from 'multer';
import {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  patchProject  // ✅ NEW: Import patch function
} from '../controller/projectController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer file upload setup for S3 ---
// Use memory storage since we're uploading directly to S3
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// --- Project API Endpoints ---
router.get('/', protect, getAllProjects);
router.post('/', protect, upload.single("projectImage"), createProject);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, upload.single("projectImage"), updateProject);
router.patch('/:id', protect, patchProject); // ✅ NEW: PATCH endpoint for partial updates (like status)
router.delete('/:id', protect, deleteProject);

export default router;