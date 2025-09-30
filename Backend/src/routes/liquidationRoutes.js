import express from 'express';
import * as liquidationController from '../controller/liquidationController.js';
import { protect } from '../middleware/authMiddleware.js';  // CHANGED: named import

const router = express.Router();

// All routes require authentication
router.use(protect);  // CHANGED: use 'protect' instead of 'authMiddleware'

// Get all liquidations for a project
router.get('/:projectId/liquidations', liquidationController.getLiquidations);

// Get single liquidation
router.get('/:projectId/liquidations/:liquidationId', liquidationController.getLiquidationById);

// Create new liquidation
router.post('/:projectId/liquidations', liquidationController.createLiquidation);

// Update liquidation
router.put('/:projectId/liquidations/:liquidationId', liquidationController.updateLiquidation);

// Delete liquidation
router.delete('/:projectId/liquidations/:liquidationId', liquidationController.deleteLiquidation);

// Generate PDF
router.get('/:projectId/liquidations/:liquidationId/pdf', liquidationController.generateLiquidationPDF);

export default router;