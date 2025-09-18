import express from 'express';
import { createComment, getCommentsForUpdate } from '../controller/commentController.js';

const router = express.Router();

// Route to create a new comment for a specific progress update
// POST /api/comments/some-update-id
router.post('/:updateId', createComment);

// Route to get all comments for a specific progress update
// GET /api/comments/some-update-id
router.get('/:updateId', getCommentsForUpdate);

export default router;