import express from 'express';
import {
    initiateRegistration,
    verifyAndRegister,
    resendVerificationCode
} from '../controller/registrationController.js';

const router = express.Router();

// Public routes
router.post('/initiate', initiateRegistration);
router.post('/verify', verifyAndRegister);
router.post('/resend-code', resendVerificationCode);

export default router;