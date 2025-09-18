import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- AWS DynamoDB Client Setup ---
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';

// IMPORTANT: In a real-world application, this should be in an environment variable (.env file)
const JWT_SECRET = 'your-super-secret-key-for-now';

// --- Controller Functions ---

/**
 * @desc     Get all users (for admin purposes)
 * @route    GET /api/users
 * @access   Private/Admin
 */
export const getAllUsers = async (req, res) => {
    const params = {
        TableName: tableName,
    };

    try {
        const data = await docClient.send(new ScanCommand(params));
        // Best Practice: Never return hashed passwords to the client.
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

/**
 * @desc     Register a new user
 * @route    POST /api/users/register
 * @access   Public
 */
export const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Please provide all required fields." });
    }

    try {
        // 1. Check if user with this email already exists
        const scanParams = {
            TableName: tableName,
            FilterExpression: "email = :email",
            ExpressionAttributeValues: { ":email": email },
        };
        const existingUsers = await docClient.send(new ScanCommand(scanParams));

        if (existingUsers.Items.length > 0) {
            return res.status(400).json({ message: "User with this email already exists" });
        }
        
        // 2. If email is new, proceed to create user
        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const putParams = {
            TableName: tableName,
            Item: {
                userId,
                name,
                email,
                password: hashedPassword,
                role,
                createdAt: new Date().toISOString(),
            },
        };
        await docClient.send(new PutCommand(putParams));

        // 3. Auto-login on register: Generate a token for the new user
        const payload = { id: userId, role: role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: 'User registered successfully!',
            token, // Send the token back to the frontend
            user: { userId, name, email, role }
        });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Failed to register user", error: error.message });
    }
};

/**
 * @desc     Authenticate a user and get a token
 * @route    POST /api/users/login
 * @access   Public
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password." });
    }

    const scanParams = {
        TableName: tableName,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
    };

    try {
        const data = await docClient.send(new ScanCommand(scanParams));

        if (data.Items.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = data.Items[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        
        const payload = { id: user.userId, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: "Login successful!",
            token,
            user: { userId: user.userId, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};