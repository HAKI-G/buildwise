import express from 'express';
import { 
  createMilestone, 
  getMilestonesForProject,
  updateMilestone,
  deleteMilestone,
  canCompletePhase,      // ✅ NEW
  completePhase          // ✅ NEW
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

// ✅ NEW: Check if phase can be completed
// @desc    Check if all tasks in phase are completed
// @route   GET /api/milestones/:projectId/phase/:phaseId/can-complete
// @access  Private
router.get('/:projectId/phase/:phaseId/can-complete', protect, canCompletePhase);

// ✅ NEW: Complete a phase (validates all tasks completed first)
// @desc    Mark phase as completed (only if all tasks done)
// @route   POST /api/milestones/:projectId/phase/:phaseId/complete
// @access  Private
router.post('/:projectId/phase/:phaseId/complete', protect, completePhase);

export default router;