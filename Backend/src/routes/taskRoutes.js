import express from 'express';
import { 
  createMilestone, 
  getMilestonesForProject,
  updateMilestone,
  deleteMilestone 
} from '../controller/milestoneController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// These routes are aliases to milestone routes
// This allows frontend to use /api/tasks while backend treats them as milestones

// @desc    Create a new task (stored as milestone)
// @route   POST /api/tasks
// @access  Private
router.post('/', protect, async (req, res) => {
  // Extract projectId from request body since tasks route doesn't have it in URL
  req.params.projectId = req.body.projectId;
  await createMilestone(req, res);
});

// @desc    Get all tasks for a project (from milestones)
// @route   GET /api/tasks/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, getMilestonesForProject);

// @desc    Update a task (milestone)
// @route   PUT /api/tasks/:projectId/:milestoneId
// @access  Private
router.put('/:projectId/:milestoneId', protect, updateMilestone);

// @desc    Delete a task (milestone)
// @route   DELETE /api/tasks/:projectId/:milestoneId
// @access  Private
router.delete('/:projectId/:milestoneId', protect, deleteMilestone);

export default router;