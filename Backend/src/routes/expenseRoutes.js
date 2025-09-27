import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createExpense, getExpensesForProject } from '../controller/ExpenseController.js';
const router = express.Router();

// --- Expense Routes ---

// @desc    Get all expenses for a specific project
// @route   GET /api/expenses/project/:projectId
// @access  Private
router.get('/project/:projectId', protect, getExpensesForProject);

// @desc    Create a new expense for a project
// @route   POST /api/expenses/:projectId
// @access  Private
router.post('/:projectId', protect, createExpense);

export default router;