import express from 'express';
import {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject
} from '../controller/projectController.js';

const router = express.Router();

// --- Project API Endpoints ---

// GET /api/projects
// Get a list of all projects
router.get('/', getAllProjects);

// POST /api/projects
// Create a new project
router.post('/', createProject);

// GET /api/projects/:id
// Get a single project by its ID
router.get('/:id', getProjectById);

// PUT /api/projects/:id
// Update an existing project by its ID
router.put('/:id', updateProject);

// DELETE /api/projects/:id
// Delete a project by its ID
router.delete('/:id', deleteProject);


export default router;