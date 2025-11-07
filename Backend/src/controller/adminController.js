import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendNotification } from './notificationController.js';  // ✅ ADD THIS

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseUsers';

// Get all users (Admin only)
export const getAllUsersAdmin = async (req, res) => {
  try {
    const params = { TableName: tableName };
    const data = await docClient.send(new ScanCommand(params));
    
    // Remove passwords
    const users = data.Items.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get single user by ID (Admin only)
export const getUserByIdAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const params = {
      TableName: tableName,
      Key: { userId }
    };
    
    const data = await docClient.send(new GetCommand(params));
    
    if (!data.Item) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = data.Item;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create user (Admin only)
export const createUserAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate role
    const validRoles = ['Admin', 'Project Manager', 'Site Engineer', 'Vice President'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles });
    }
    
    // Check if email exists
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    };
    
    const existingUsers = await docClient.send(new ScanCommand(scanParams));
    if (existingUsers.Items.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userId = uuidv4();
    const newUser = {
      userId,
      name,
      email,
      password: hashedPassword,
      role,
      avatar: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const putParams = {
      TableName: tableName,
      Item: newUser
    };
    
    await docClient.send(new PutCommand(putParams));
    
    // ✅ ADD THIS - Notify all admins
 await sendNotification(
  'USER_CREATED',
  'New User Registered',
  `${name} has registered as a ${role}`,
  { userId, userName: name, userEmail: email, userRole: role }
);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user (Admin only)
export const updateUserAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password, role } = req.body;
    
    // ✅ Get current user data for notifications
    const getUserParams = {
      TableName: tableName,
      Key: { userId }
    };
    const currentUserData = await docClient.send(new GetCommand(getUserParams));
    
    if (!currentUserData.Item) {
      return res.status(404).json({ error: 'User not found' });
    }
    
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
    
    if (password !== undefined && password !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateExpression.push('password = :p');
      expressionAttributeValues[':p'] = hashedPassword;
    }
    
    // ✅ Check if role changed and send notification
    if (role !== undefined) {
      const validRoles = ['Admin', 'Project Manager', 'Site Engineer', 'Vice President'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role', validRoles });
      }
      updateExpression.push('#role = :r');
      expressionAttributeNames['#role'] = 'role';
      expressionAttributeValues[':r'] = role;
      
      // ✅ Send notification if role changed
   if (currentUserData.Item.role !== role) {
  await sendNotification(
    'USER_ROLE_CHANGED',
    'User Role Updated',
    `${currentUserData.Item.name}'s role changed from ${currentUserData.Item.role} to ${role}`,
    { userId, userName: currentUserData.Item.name, oldRole: currentUserData.Item.role, newRole: role }
  );
}
    }
    
    updateExpression.push('updatedAt = :u');
    expressionAttributeValues[':u'] = new Date().toISOString();
    
    if (updateExpression.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const params = {
      TableName: tableName,
      Key: { userId },
      UpdateExpression: `set ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const data = await docClient.send(new UpdateCommand(params));
    
    const { password: _, ...userWithoutPassword } = data.Attributes;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (Admin only)
export const deleteUserAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const getParams = {
      TableName: tableName,
      Key: { userId }
    };
    
    const userData = await docClient.send(new GetCommand(getParams));
    if (!userData.Item) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user
    const deleteParams = {
      TableName: tableName,
      Key: { userId }
    };
    
    await docClient.send(new DeleteCommand(deleteParams));
    res.json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};