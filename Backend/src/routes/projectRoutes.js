import express from 'express';
import multer from 'multer';
import {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject
} from '../controller/projectController.js';
import { protect } from '../middleware/authMiddleware.js'; // make sure you have this

const router = express.Router();

// --- Multer file upload setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// --- Project API Endpoints ---
router.get('/', protect, getAllProjects);
router.post('/', protect, upload.single("file"), createProject); // protect + upload
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

export default router;
