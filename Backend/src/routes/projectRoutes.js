import express from 'express';
import multer from 'multer';
import {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  patchProject,
  updateProjectStatus  // ✅ NEW: Import status update
} from '../controller/projectController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer file upload setup for S3 ---
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
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
router.patch('/:id', protect, patchProject);
router.delete('/:id', protect, deleteProject);

// ✅ NEW: Manual status update route
router.patch('/:projectId/status', protect, updateProjectStatus);

export default router;