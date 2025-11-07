import express from 'express';
import {
    requestPasswordReset,
    verifyResetCode,
    resetPassword
} from '../controller/forgotPasswordController.js';

const router = express.Router();

// Public routes (no authentication needed)
router.post('/request', requestPasswordReset);
router.post('/verify-code', verifyResetCode);
router.post('/reset', resetPassword);

export default router;