import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    GetCommand, 
    UpdateCommand,
    ScanCommand 
} from "@aws-sdk/lib-dynamodb";
import { 
    generate2FASecret, 
    generateQRCode, 
    verify2FAToken, 
    generateBackupCodes 
} from '../services/twoFactorService.js';
import { 
    send2FAEnabledEmail, 
    send2FADisabledEmail 
} from '../services/emailService.js';
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';

// STEP 1: Setup 2FA - Generate Secret & QR Code
export const setup2FA = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user
        const params = {
            TableName: tableName,
            Key: { userId }
        };
        const { Item: user } = await docClient.send(new GetCommand(params));

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if 2FA is already enabled
        if (user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is already enabled for this account' });
        }

        // Generate secret
        const { secret, otpauth_url } = generate2FASecret(user.email, user.name);

        // Generate QR code
        const qrCode = await generateQRCode(otpauth_url);

        // Generate backup codes
        const backupCodes = generateBackupCodes();

        // Store secret (temporarily, will be confirmed in next step)
        const updateParams = {
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'SET twoFactorSecret = :secret, twoFactorTemp = :temp, backupCodes = :codes, updatedAt = :now',
            ExpressionAttributeValues: {
                ':secret': secret,
                ':temp': true, // Mark as temporary until verified
                ':codes': backupCodes,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        res.json({
            message: '2FA setup initiated',
            secret,
            qrCode,
            backupCodes,
            manualEntryKey: secret
        });

    } catch (error) {
        console.error('Error setting up 2FA:', error);
        res.status(500).json({ message: 'Failed to setup 2FA' });
    }
};

// STEP 2: Verify & Enable 2FA
export const verify2FA = async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Verification token is required' });
        }

        // Get user
        const params = {
            TableName: tableName,
            Key: { userId }
        };
        const { Item: user } = await docClient.send(new GetCommand(params));

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: '2FA setup not initiated' });
        }

        // Verify token
        const isValid = verify2FAToken(token, user.twoFactorSecret);

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Enable 2FA
        const updateParams = {
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'SET twoFactorEnabled = :enabled, twoFactorTemp = :temp, updatedAt = :now',
            ExpressionAttributeValues: {
                ':enabled': true,
                ':temp': false,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        // ✅ SEND EMAIL NOTIFICATION - 2FA Enabled
        try {
            await send2FAEnabledEmail(user.email, user.name);
            console.log(`✅ 2FA enabled email sent to ${user.email}`);
        } catch (emailError) {
            console.error('❌ Failed to send 2FA enabled email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            message: '2FA has been successfully enabled',
            twoFactorEnabled: true
        });

    } catch (error) {
        console.error('Error verifying 2FA:', error);
        res.status(500).json({ message: 'Failed to verify 2FA' });
    }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, token } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required to disable 2FA' });
        }

        // Get user
        const params = {
            TableName: tableName,
            Key: { userId }
        };
        const { Item: user } = await docClient.send(new GetCommand(params));

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Verify 2FA token if 2FA is enabled
        if (user.twoFactorEnabled && token) {
            const isValid = verify2FAToken(token, user.twoFactorSecret);
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid 2FA code' });
            }
        }

        // Disable 2FA
        const updateParams = {
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'SET twoFactorEnabled = :disabled, twoFactorSecret = :null, backupCodes = :null, updatedAt = :now',
            ExpressionAttributeValues: {
                ':disabled': false,
                ':null': null,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        // ✅ SEND EMAIL NOTIFICATION - 2FA Disabled (WARNING)
        try {
            await send2FADisabledEmail(user.email, user.name);
            console.log(`⚠️ 2FA disabled email sent to ${user.email}`);
        } catch (emailError) {
            console.error('❌ Failed to send 2FA disabled email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            message: '2FA has been disabled',
            twoFactorEnabled: false
        });

    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ message: 'Failed to disable 2FA' });
    }
};

// Verify 2FA during login
export const verify2FALogin = async (req, res) => {
    try {
        const { email, token, backupCode } = req.body;

        if (!email || (!token && !backupCode)) {
            return res.status(400).json({ message: 'Email and token/backup code are required' });
        }

        // Get user by email
        const scanParams = {
            TableName: tableName,
            FilterExpression: "email = :email",
            ExpressionAttributeValues: { ":email": email },
        };

        const data = await docClient.send(new ScanCommand(scanParams));
        
        if (data.Items.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = data.Items[0];

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not enabled for this account' });
        }

        let isValid = false;

        // Check backup code first
        if (backupCode && user.backupCodes && user.backupCodes.includes(backupCode)) {
            isValid = true;
            
            // Remove used backup code
            const updatedCodes = user.backupCodes.filter(code => code !== backupCode);
            const updateParams = {
                TableName: tableName,
                Key: { userId: user.userId },
                UpdateExpression: 'SET backupCodes = :codes',
                ExpressionAttributeValues: {
                    ':codes': updatedCodes
                }
            };
            await docClient.send(new UpdateCommand(updateParams));
            
        } else if (token) {
            // Verify TOTP token
            isValid = verify2FAToken(token, user.twoFactorSecret);
        }

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid verification code or backup code' });
        }

        res.json({
            message: '2FA verification successful',
            verified: true
        });

    } catch (error) {
        console.error('Error verifying 2FA login:', error);
        res.status(500).json({ message: 'Failed to verify 2FA' });
    }
};

// Get 2FA status
export const get2FAStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const params = {
            TableName: tableName,
            Key: { userId }
        };
        const { Item: user } = await docClient.send(new GetCommand(params));

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            twoFactorEnabled: user.twoFactorEnabled || false,
            backupCodesRemaining: user.backupCodes?.length || 0
        });

    } catch (error) {
        console.error('Error getting 2FA status:', error);
        res.status(500).json({ message: 'Failed to get 2FA status' });
    }
};

// Regenerate backup codes
export const regenerateBackupCodes = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Get user
        const params = {
            TableName: tableName,
            Key: { userId }
        };
        const { Item: user } = await docClient.send(new GetCommand(params));

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes();

        // Update backup codes
        const updateParams = {
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'SET backupCodes = :codes, updatedAt = :now',
            ExpressionAttributeValues: {
                ':codes': backupCodes,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(updateParams));

        res.json({
            message: 'Backup codes regenerated successfully',
            backupCodes
        });

    } catch (error) {
        console.error('Error regenerating backup codes:', error);
        res.status(500).json({ message: 'Failed to regenerate backup codes' });
    }
};

export default {
    setup2FA,
    verify2FA,
    disable2FA,
    verify2FALogin,
    get2FAStatus,
    regenerateBackupCodes
};