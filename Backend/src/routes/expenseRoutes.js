import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createExpense, getExpensesForProject, updateExpense, deleteExpense } from '../controller/ExpenseController.js';
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

// @desc    Update an expense (S19: price/material updates)
// @route   PUT /api/expenses/:projectId/:expenseId
// @access  Private
router.put('/:projectId/:expenseId', protect, updateExpense);

// @desc    Delete an expense
// @route   DELETE /api/expenses/:projectId/:expenseId
// @access  Private
router.delete('/:projectId/:expenseId', protect, deleteExpense);

export default router;