import express from 'express';
import { 
  createMilestone, 
  getMilestonesForProject,
  updateMilestone,
  deleteMilestone 
} from '../controller/milestoneController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all milestones for a specific project
// @route   GET /api/milestones/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, getMilestonesForProject);

// @desc    Create a new milestone/task for a project
// @route   POST /api/milestones/:projectId
// @access  Private
router.post('/:projectId', protect, createMilestone);

// @desc    Update a milestone/task
// @route   PUT /api/milestones/:projectId/:milestoneId
// @access  Private
router.put('/:projectId/:milestoneId', protect, updateMilestone);

// @desc    Delete a milestone/task
// @route   DELETE /api/milestones/:projectId/:milestoneId
// @access  Private
router.delete('/:projectId/:milestoneId', protect, deleteMilestone);

export default router;