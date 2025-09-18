import express from 'express';
import { createProgressUpdate, getUpdatesForMilestone } from '../controller/progressUpdateController.js';

const router = express.Router();

// Route to create a new progress update for a specific milestone
// POST /api/updates/some-milestone-id
router.post('/:milestoneId', createProgressUpdate);

// Route to get all progress updates for a specific milestone
// GET /api/updates/some-milestone-id
router.get('/:milestoneId', getUpdatesForMilestone);

export default router;