import express from 'express';
import { 
  createMilestone, 
  getMilestonesForProject,
  updateMilestone,
  deleteMilestone,
  deleteAllMilestones,
  canCompletePhase,
  completePhase,
  updateTaskCompletion,
  getProjectProgress,
  syncTaskStatusFromPhotos  // ✅ NEW
} from '../controller/milestoneController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all milestones for a specific project
// @route   GET /api/milestones/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, getMilestonesForProject);

// ✅ NEW: Get overall project progress
// @desc    Get project progress statistics
// @route   GET /api/milestones/:projectId/progress
// @access  Private
router.get('/:projectId/progress', protect, getProjectProgress);

// @desc    Check if phase can be completed
// @route   GET /api/milestones/:projectId/phase/:phaseId/can-complete
// @access  Private
router.get('/:projectId/phase/:phaseId/can-complete', protect, canCompletePhase);

// @desc    Mark phase as completed (only if all tasks done)
// @route   POST /api/milestones/:projectId/phase/:phaseId/complete
// @access  Private
router.post('/:projectId/phase/:phaseId/complete', protect, completePhase);

// @desc    Create a new milestone/task for a project
// @route   POST /api/milestones/:projectId
// @access  Private
router.post('/:projectId', protect, createMilestone);

// ✅ NEW: Sync task status from photo confirmations
// @desc    Trigger task status update based on confirmed photos
// @route   POST /api/milestones/:projectId/task/:taskId/sync-status
// @access  Private
router.post('/:projectId/task/:taskId/sync-status', protect, syncTaskStatusFromPhotos);

// ✅ NEW: Update task completion percentage
// @desc    Update task completion percentage (0-100)
// @route   PUT /api/milestones/:projectId/task/:taskId/completion
// @access  Private
router.put('/:projectId/task/:taskId/completion', protect, updateTaskCompletion);

// @desc    Update a milestone/task
// @route   PUT /api/milestones/:projectId/:milestoneId
// @access  Private
router.put('/:projectId/:milestoneId', protect, updateMilestone);

// @desc    Delete ALL milestones/tasks for a project (cleanup utility)
// @route   DELETE /api/milestones/project/:projectId/clear-all
// @access  Private
router.delete('/project/:projectId/clear-all', protect, deleteAllMilestones);

// @desc    Delete a milestone/task
// @route   DELETE /api/milestones/:projectId/:milestoneId
// @access  Private
router.delete('/:projectId/:milestoneId', protect, deleteMilestone);

export default router;