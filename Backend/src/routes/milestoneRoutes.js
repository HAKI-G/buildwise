import express from 'express';
import { createMilestone, getMilestonesForProject } from '../controller/milestoneController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming you have an auth middleware

const router = express.Router();

// @desc    Get all milestones for a specific project
// @route   GET /api/milestones/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, getMilestonesForProject);

// @desc    Create a new milestone for a project
// @route   POST /api/milestones/:projectId
// @access  Private
router.post('/:projectId', protect, createMilestone);

export default router;
