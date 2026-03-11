import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logAudit } from './auditController.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { 
  recordFailedAttempt, 
  isAccountLocked, 
  resetAttempts 
} from '../utils/loginAttemptTracker.js';
import { verify2FAToken } from '../services/twoFactorService.js'; // ✅ Add this import
import { uploadToS3 } from '../utils/s3Upload.js';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-now';

export const getAllUsers = async (req, res) => {
    const params = { TableName: tableName };
    try {
        const data = await docClient.send(new ScanCommand(params));
        const usersWithoutPasswords = data.Items.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        res.status(200).json(usersWithoutPasswords);
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }
};

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body; // ✅ No role from frontend
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide all required fields." });
    }

    // Normalize email to lowercase
    const emailNormalized = email.trim().toLowerCase();

    try {
        // ✅ Validate password against security settings
        const validation = await validatePassword(password);
        if (!validation.isValid) {
            return res.status(400).json({ 
                message: "Password does not meet security requirements",
                errors: validation.errors 
            });
        }

        // Case-insensitive email uniqueness check
        const scanParams = {
            TableName: tableName,
        };
        const existingUsers = await docClient.send(new ScanCommand(scanParams));
        const emailExists = existingUsers.Items.some(item => 
            item.email && item.email.trim().toLowerCase() === emailNormalized
        );
        if (emailExists) {
            return res.status(400).json({ message: "User with this email already exists" });
        }
        
        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // ✅ ASSIGN DEFAULT ROLE 
        const defaultRole = 'Project Manager';
        
        const putParams = {
            TableName: tableName,
            Item: { 
                userId, 
                name, 
                email: emailNormalized, 
                password: hashedPassword, 
                role: defaultRole, // ✅ Default role assigned
                avatar: '',
                twoFactorEnabled: false, // ✅ Add 2FA fields
                twoFactorSecret: '', // ✅ Initially empty
                backupCodes: [], // ✅ Initially empty
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
        };
        await docClient.send(new PutCommand(putParams));

        // Create audit log
        await logAudit({
            userId: userId,
            action: 'USER_CREATED',
            actionDescription: `New user registered: ${name} (${defaultRole})`,
            targetType: 'user',
            targetId: userId
        });
        
        const payload = { id: userId, role: defaultRole, email: emailNormalized, name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({
            message: 'User registered successfully! Your role will be assigned by an administrator.',
            token,
            user: { userId, name, email: emailNormalized, role: defaultRole, avatar: '' }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Failed to register user", error: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password, twoFactorCode } = req.body; // ✅ Add twoFactorCode
    
    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password." });
    }

    // Normalize email for case-insensitive login
    const emailNormalized = email.trim().toLowerCase();

    try {
        // ✅ Check if account is locked
        const lockStatus = await isAccountLocked(emailNormalized);
        if (lockStatus.isLocked) {
            return res.status(423).json({ 
                message: lockStatus.message,
                remainingMinutes: lockStatus.remainingMinutes
            });
        }

        // Case-insensitive email lookup
        const scanParams = {
            TableName: tableName,
        };
        
        const data = await docClient.send(new ScanCommand(scanParams));
        const matchedUser = data.Items.find(item => 
            item.email && item.email.trim().toLowerCase() === emailNormalized
        );
        
        if (!matchedUser) {
            // ✅ Record failed attempt
            const attemptResult = await recordFailedAttempt(emailNormalized);
            return res.status(401).json({ 
                message: attemptResult.message,
                attemptsRemaining: attemptResult.attemptsRemaining
            });
        }
        
        const user = matchedUser;
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // ✅ Record failed attempt
            const attemptResult = await recordFailedAttempt(emailNormalized);
            return res.status(401).json({ 
                message: attemptResult.message,
                attemptsRemaining: attemptResult.attemptsRemaining,
                isLocked: attemptResult.isLocked
            });
        }

        // ✅ CHECK IF 2FA IS ENABLED
        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                // Password is correct, but need 2FA code
                return res.status(200).json({
                    message: '2FA required',
                    requires2FA: true,
                    email: email
                });
            }
            
            // Verify 2FA code
            const is2FAValid = verify2FAToken(twoFactorCode, user.twoFactorSecret);
            if (!is2FAValid) {
                return res.status(401).json({ 
                    message: 'Invalid 2FA code',
                    requires2FA: true
                });
            }
        }

        // ✅ Reset login attempts on successful login
        await resetAttempts(email);
        
        const payload = { id: user.userId, role: user.role, email: user.email, name: user.name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(200).json({
            message: "Login successful!",
            token,
            user: { 
                userId: user.userId, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                avatar: user.avatar || '',
                twoFactorEnabled: user.twoFactorEnabled || false // ✅ Include 2FA status
            }
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    const userId = req.user.id; 
    try {
        const params = { TableName: tableName, Key: { userId } };
        const { Item } = await docClient.send(new GetCommand(params));
        
        if (Item) {
            const { password, ...userProfile } = Item;
            res.json(userProfile);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

export const updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, email, avatar, currentPassword, newPassword, phone, company, jobTitle, notificationPreferences } = req.body;
    
    try {
        // If changing password, validate it
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set a new password' });
            }

            // Get user and verify current password
            const params = { TableName: tableName, Key: { userId } };
            const { Item } = await docClient.send(new GetCommand(params));
            
            if (!Item) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(currentPassword, Item.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            // ✅ Validate new password
            const validation = await validatePassword(newPassword);
            if (!validation.isValid) {
                return res.status(400).json({ 
                    message: "New password does not meet security requirements",
                    errors: validation.errors 
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            const updatePasswordParams = {
                TableName: tableName,
                Key: { userId },
                UpdateExpression: 'SET password = :password, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':password': hashedPassword,
                    ':updatedAt': new Date().toISOString()
                }
            };
            
            await docClient.send(new UpdateCommand(updatePasswordParams));
        }

        // Update other profile fields
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        if (name !== undefined) {
            updateExpression.push('#name = :n');
            expressionAttributeNames['#name'] = 'name';
            expressionAttributeValues[':n'] = name;
        }
        if (email !== undefined) {
            updateExpression.push('email = :e');
            expressionAttributeValues[':e'] = email;
        }
        if (phone !== undefined) {
            updateExpression.push('phone = :ph');
            expressionAttributeValues[':ph'] = phone;
        }
        if (company !== undefined) {
            updateExpression.push('company = :co');
            expressionAttributeValues[':co'] = company;
        }
        if (jobTitle !== undefined) {
            updateExpression.push('jobTitle = :jt');
            expressionAttributeValues[':jt'] = jobTitle;
        }
        if (notificationPreferences !== undefined) {
            updateExpression.push('notificationPreferences = :np');
            expressionAttributeValues[':np'] = notificationPreferences;
        }
        if (avatar !== undefined) {
            let avatarValue = avatar;
            // If avatar is base64, upload to S3 and store URL instead
            if (avatar && avatar.startsWith('data:image')) {
                try {
                    const matches = avatar.match(/^data:(image\/\w+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = matches[1];
                        const base64Data = matches[2];
                        const ext = mimeType.split('/')[1] || 'jpg';
                        const buffer = Buffer.from(base64Data, 'base64');
                        const pseudoFile = {
                            buffer,
                            originalname: `avatar-${userId}.${ext}`,
                            mimetype: mimeType
                        };
                        avatarValue = await uploadToS3(pseudoFile, 'avatars');
                        console.log('📸 Avatar uploaded to S3:', avatarValue);
                    }
                } catch (s3Err) {
                    console.error('⚠️ Avatar S3 upload failed, storing as base64:', s3Err.message);
                    // Fall back to storing base64 (may fail for large images)
                }
            }
            updateExpression.push('avatar = :a');
            expressionAttributeValues[':a'] = avatarValue;
        }
        
        if (updateExpression.length > 0) {
            updateExpression.push('updatedAt = :u');
            expressionAttributeValues[':u'] = new Date().toISOString();

            const params = {
                TableName: tableName,
                Key: { userId },
                UpdateExpression: `set ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            };
            
            const { Attributes } = await docClient.send(new UpdateCommand(params));

            // Create audit log
            await logAudit({
                userId: userId,
                action: 'USER_UPDATED',
                actionDescription: 'User profile updated',
                targetType: 'user',
                targetId: userId,
                changes: { name, email, avatar, passwordChanged: !!newPassword }
            });
            
            const { password: _, ...updatedProfile } = Attributes;
            res.json({
                message: 'Profile updated successfully',
                user: updatedProfile
            });
        } else {
            res.json({ message: 'No changes made' });
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
};

// Upload avatar via multipart file upload → S3
export const uploadAvatar = async (req, res) => {
    const userId = req.user.id;
    
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        // Upload to S3
        const avatarUrl = await uploadToS3(req.file, 'avatars');
        console.log(`📸 Avatar uploaded for user ${userId}: ${avatarUrl}`);

        // Save URL to DynamoDB
        const params = {
            TableName: tableName,
            Key: { userId },
            UpdateExpression: 'SET avatar = :a, updatedAt = :u',
            ExpressionAttributeValues: {
                ':a': avatarUrl,
                ':u': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));
        const { password: _, ...updatedProfile } = Attributes;

        res.json({
            message: 'Avatar uploaded successfully',
            avatarUrl,
            user: updatedProfile
        });
    } catch (error) {
        console.error('❌ Avatar upload error:', error);
        res.status(500).json({ message: 'Failed to upload avatar' });
    }
};