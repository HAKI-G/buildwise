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

// --- AWS DynamoDB Client Setup ---
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';
const JWT_SECRET = 'your-super-secret-key-for-now';

// --- Controller Functions ---

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
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Please provide all required fields." });
    }
    try {
        const scanParams = {
            TableName: tableName,
            FilterExpression: "email = :email",
            ExpressionAttributeValues: { ":email": email },
        };
        const existingUsers = await docClient.send(new ScanCommand(scanParams));
        if (existingUsers.Items.length > 0) {
            return res.status(400).json({ message: "User with this email already exists" });
        }
        const userId = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const putParams = {
            TableName: tableName,
            Item: { userId, name, email, password: hashedPassword, role, createdAt: new Date().toISOString() },
        };
        await docClient.send(new PutCommand(putParams));
        const payload = { id: userId, role: role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({
            message: 'User registered successfully!',
            token,
            user: { userId, name, email, role }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Failed to register user", error: error.message });
    }
};

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

/**
 * @desc     Get user profile
 * @route    GET /api/users/profile
 * @access   Private
 */
export const getUserProfile = async (req, res) => {
  // The user ID comes from the 'protect' middleware
  const userId = req.user.id; 
  try {
    const params = { TableName: 'BuildWiseUsers', Key: { userId } };
    const { Item } = await docClient.send(new GetCommand(params));
    if (Item) {
      // Don't send the password back to the client
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

/**
 * @desc     Update user profile
 * @route    PUT /api/users/profile
 * @access   Private
 */
export const updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;
  try {
    const params = {
      TableName: 'BuildWiseUsers',
      Key: { userId },
      UpdateExpression: 'set #name = :n, email = :e',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':n': name, ':e': email },
      ReturnValues: 'ALL_NEW',
    };
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    // Don't send the password back
    const { password, ...updatedProfile } = Attributes;
    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

