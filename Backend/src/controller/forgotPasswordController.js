import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    ScanCommand, 
    UpdateCommand 
} from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';
import { 
    generateVerificationCode, 
    sendVerificationEmail,
    sendPasswordResetSuccessEmail 
} from '../services/emailService.js';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';

// Store verification codes temporarily (in production, use Redis or DynamoDB)
const verificationCodes = new Map();

// STEP 1: Request password reset (send code to email)
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Normalize email to lowercase for case-insensitive matching
        const emailNormalized = email.trim().toLowerCase();

        // Find user by email (case-insensitive scan)
        const scanParams = {
            TableName: tableName,
        };

        const data = await docClient.send(new ScanCommand(scanParams));
        const user = data.Items.find(item => 
            item.email && item.email.trim().toLowerCase() === emailNormalized
        );
        
        if (!user) {
            // Don't reveal if email exists or not (security best practice)
            return res.json({ 
                message: 'If the email exists, a verification code has been sent.',
                codeSent: true 
            });
        }

        // Generate 6-digit code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        // Store code temporarily (use the actual email from DB for sending, normalized key for lookup)
        verificationCodes.set(emailNormalized, {
            code,
            expiresAt,
            attempts: 0
        });

        // Send email to the actual email address stored in the database
        try {
            await sendVerificationEmail(user.email, code);
            console.log(`📧 Verification code for ${user.email}: ${code}`);
        } catch (emailError) {
            console.error('❌ Failed to send email:', emailError.message);
            // Remove the stored code since email failed
            verificationCodes.delete(emailNormalized);
            return res.status(500).json({ 
                message: 'Failed to send verification email. Please try again later.',
                codeSent: false 
            });
        }

        res.json({ 
            message: 'Verification code sent to your email',
            codeSent: true 
        });

    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Failed to send verification code' });
    }
};

// STEP 2: Verify code
export const verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: 'Email and code are required' });
        }

        // Normalize email for consistent lookup
        const emailNormalized = email.trim().toLowerCase();
        const stored = verificationCodes.get(emailNormalized);

        if (!stored) {
            return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
        }

        // Check if expired
        if (Date.now() > stored.expiresAt) {
            verificationCodes.delete(emailNormalized);
            return res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
        }

        // Check attempts (prevent brute force)
        if (stored.attempts >= 5) {
            verificationCodes.delete(emailNormalized);
            return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });
        }

        // Verify code
        if (stored.code !== code) {
            stored.attempts++;
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Code is valid
        res.json({ 
            message: 'Code verified successfully',
            verified: true 
        });

    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ message: 'Failed to verify code' });
    }
};

// STEP 3: Reset password
export const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }

        // Normalize email for consistent lookup
        const emailNormalized = email.trim().toLowerCase();

        // Verify code one more time
        const stored = verificationCodes.get(emailNormalized);

        if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Find user (case-insensitive)
        const scanParams = {
            TableName: tableName,
        };

        const data = await docClient.send(new ScanCommand(scanParams));
        const user = data.Items.find(item => 
            item.email && item.email.trim().toLowerCase() === emailNormalized
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const updateParams = {
            TableName: tableName,
            Key: { userId: user.userId },
            UpdateExpression: 'SET password = :password, updatedAt = :now',
            ExpressionAttributeValues: {
                ':password': hashedPassword,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        // Remove verification code
        verificationCodes.delete(emailNormalized);

        // Send success email to actual stored address
        await sendPasswordResetSuccessEmail(user.email, user.name);

        res.json({ 
            message: 'Password reset successfully',
            success: true 
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};

export default {
    requestPasswordReset,
    verifyResetCode,
    resetPassword
};