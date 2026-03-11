import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    ScanCommand, 
    PutCommand 
} from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { 
    generateVerificationCode, 
    sendRegistrationVerificationEmail,
    sendWelcomeEmail 
} from '../services/emailService.js';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';

// Store pending registrations temporarily (use Redis in production)
const pendingRegistrations = new Map();

// STEP 1: Initiate registration - send verification code
export const initiateRegistration = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Normalize email to lowercase
        const emailNormalized = email.trim().toLowerCase();

        // Check if email already exists (case-insensitive)
        const scanParams = {
            TableName: tableName,
        };

        const data = await docClient.send(new ScanCommand(scanParams));
        const emailExists = data.Items.some(item => 
            item.email && item.email.trim().toLowerCase() === emailNormalized
        );
        
        if (emailExists) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Generate verification code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store pending registration (use normalized email as key)
        pendingRegistrations.set(emailNormalized, {
            name,
            email: emailNormalized,
            password: hashedPassword,
            role: role || 'User',
            code,
            expiresAt,
            attempts: 0
        });

        // Send verification email
        await sendRegistrationVerificationEmail(emailNormalized, name, code);

        // Log for debugging (remove in production)
        console.log(`📧 Registration code for ${emailNormalized}: ${code}`);

        res.json({ 
            message: 'Verification code sent to your email',
            email: emailNormalized,
            codeSent: true 
        });

    } catch (error) {
        console.error('Error initiating registration:', error);
        res.status(500).json({ message: 'Failed to initiate registration' });
    }
};

// STEP 2: Verify code and create account
export const verifyAndRegister = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        // Normalize email for consistent lookup
        const emailNormalized = email.trim().toLowerCase();

        // Get pending registration
        const pending = pendingRegistrations.get(emailNormalized);

        if (!pending) {
            return res.status(400).json({ message: 'No pending registration found. Please register again.' });
        }

        // Check if expired
        if (Date.now() > pending.expiresAt) {
            pendingRegistrations.delete(emailNormalized);
            return res.status(400).json({ message: 'Verification code expired. Please register again.' });
        }

        // Check attempts (prevent brute force)
        if (pending.attempts >= 5) {
            pendingRegistrations.delete(emailNormalized);
            return res.status(429).json({ message: 'Too many failed attempts. Please register again.' });
        }

        // Verify code
        if (pending.code !== code) {
            pending.attempts++;
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Code is valid - Create user account
        const userId = uuidv4();
        const now = new Date().toISOString();

        const newUser = {
            userId,
            name: pending.name,
            email: pending.email,
            password: pending.password,
            role: pending.role,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            twoFactorEnabled: false,
            avatar: ''
        };

        const putParams = {
            TableName: tableName,
            Item: newUser
        };

        await docClient.send(new PutCommand(putParams));

        // Remove pending registration
        pendingRegistrations.delete(emailNormalized);

        // Send welcome email
        await sendWelcomeEmail(pending.email, pending.name);

        // Generate JWT token
        const token = jwt.sign(
            { id: userId, email: pending.email, name: pending.name, role: pending.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: {
                userId,
                name: pending.name,
                email: pending.email,
                role: pending.role,
                avatar: ''
            }
        });

    } catch (error) {
        console.error('Error verifying registration:', error);
        res.status(500).json({ message: 'Failed to complete registration' });
    }
};

// Resend verification code
export const resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const pending = pendingRegistrations.get(email);

        if (!pending) {
            return res.status(400).json({ message: 'No pending registration found' });
        }

        // Generate new code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        // Update pending registration
        pending.code = code;
        pending.expiresAt = expiresAt;
        pending.attempts = 0;

        // Resend email
        await sendRegistrationVerificationEmail(email, pending.name, code);

        console.log(`📧 Resent code for ${email}: ${code}`);

        res.json({ 
            message: 'New verification code sent to your email',
            codeSent: true 
        });

    } catch (error) {
        console.error('Error resending code:', error);
        res.status(500).json({ message: 'Failed to resend verification code' });
    }
};

export default {
    initiateRegistration,
    verifyAndRegister,
    resendVerificationCode
};