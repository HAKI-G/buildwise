
import express from 'express';
import {
    generateAIReport,
    getReportsForProject,
    getReportById,
    deleteReport
} from '../controller/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate AI report for a project
router.post('/generate/:projectId', protect, generateAIReport);

// Get all reports for a project
router.get('/project/:projectId', protect, getReportsForProject);

// Get single report by ID
router.get('/:reportId', protect, getReportById);

// Delete a report
router.delete('/:reportId', protect, deleteReport);

export default router;
