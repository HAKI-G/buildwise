import express from 'express';
import * as documentController from '../controller/documentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// View document - NO AUTH REQUIRED (uses presigned URL)
router.get('/:documentId/view', documentController.viewDocument);

// All other routes require authentication
router.use(protect);

// Get all documents for a project
router.get('/project/:projectId', documentController.getProjectDocuments);

// Upload document
router.post('/upload', documentController.upload.single('document'), documentController.uploadDocument);

// Download document
router.get('/:documentId/download', documentController.downloadDocument);

// Update document status
router.put('/:documentId/status', documentController.updateDocumentStatus);

// Delete document
router.delete('/:documentId', documentController.deleteDocument);

export default router;