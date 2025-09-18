import express from 'express';
import { createMilestone, getMilestonesForProject } from '../controller/milestoneController.js';

const router = express.Router();

// Route to get all milestones for a specific project
// Example: GET http://localhost:5001/api/milestones/project-123
router.get('/:projectId', getMilestonesForProject);

// Route to create a new milestone for a specific project
// Example: POST http://localhost:5001/api/milestones/project-123
router.post('/:projectId', createMilestone);

export default router;