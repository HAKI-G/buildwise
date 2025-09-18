import express from 'express';
import { uploadDocument, uploadDocumentForProject, getDocumentsForProject } from '../controller/documentController.js';

const router = express.Router();

// Route to upload a single document for a project.
// The string 'document' must match the key name you use in Postman.
router.post('/:projectId', uploadDocument.single('document'), uploadDocumentForProject);

// Route to get all documents for a specific project
router.get('/:projectId', getDocumentsForProject);

export default router;