import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const SETTINGS_TABLE = "BuildWiseSettings";
const USERS_TABLE = "BuildWiseUsers";

// ============================================
// GET ALL SETTINGS
// ============================================
export const getAllSettings = async (req, res) => {
  try {
    const params = {
      TableName: SETTINGS_TABLE
    };

    const data = await docClient.send(new ScanCommand(params));
    
    // Convert array of settings to grouped object
    const settings = {
      general: {},
      security: {},
      notifications: {},
      system: {}
    };

    if (data.Items) {
      data.Items.forEach(item => {
        if (settings[item.category]) {
          settings[item.category][item.key] = item.value;
        }
      });
    }

    // Add default values if settings don't exist
    settings.general = {
      appName: settings.general.appName || 'BuildWise',
      companyName: settings.general.companyName || '',
      supportEmail: settings.general.supportEmail || '',
      supportPhone: settings.general.supportPhone || '',
      timezone: settings.general.timezone || 'Asia/Manila',
      dateFormat: settings.general.dateFormat || 'MM/DD/YYYY',
      currency: settings.general.currency || 'PHP',
      ...settings.general
    };

    settings.security = {
      sessionTimeout: settings.security.sessionTimeout || 30,
      maxLoginAttempts: settings.security.maxLoginAttempts || 5,
      passwordMinLength: settings.security.passwordMinLength || 8,
      requireSpecialChar: settings.security.requireSpecialChar !== undefined ? settings.security.requireSpecialChar : true,
      requireNumber: settings.security.requireNumber !== undefined ? settings.security.requireNumber : true,
      requireUppercase: settings.security.requireUppercase !== undefined ? settings.security.requireUppercase : true,
      enable2FA: settings.security.enable2FA || false,
      ...settings.security
    };

    settings.notifications = {
      emailNotifications: settings.notifications.emailNotifications !== undefined ? settings.notifications.emailNotifications : true,
      projectCreated: settings.notifications.projectCreated !== undefined ? settings.notifications.projectCreated : true,
      projectUpdated: settings.notifications.projectUpdated !== undefined ? settings.notifications.projectUpdated : true,
      projectDeleted: settings.notifications.projectDeleted !== undefined ? settings.notifications.projectDeleted : true,
      userCreated: settings.notifications.userCreated !== undefined ? settings.notifications.userCreated : true,
      userRoleChanged: settings.notifications.userRoleChanged !== undefined ? settings.notifications.userRoleChanged : true,
      systemAlerts: settings.notifications.systemAlerts !== undefined ? settings.notifications.systemAlerts : true,
      ...settings.notifications
    };

    settings.system = {
      maintenanceMode: settings.system.maintenanceMode || false,
      allowNewRegistrations: settings.system.allowNewRegistrations !== undefined ? settings.system.allowNewRegistrations : true,
      maxProjectsPerUser: settings.system.maxProjectsPerUser || 50,
      maxFileSize: settings.system.maxFileSize || 10,
      allowedFileTypes: settings.system.allowedFileTypes || 'pdf,doc,docx,xls,xlsx,jpg,png',
      enableAuditLogs: settings.system.enableAuditLogs !== undefined ? settings.system.enableAuditLogs : true,
      auditLogRetention: settings.system.auditLogRetention || 90,
      ...settings.system
    };

    res.status(200).json(settings);

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

// ============================================
// GET SETTINGS BY CATEGORY
// ============================================
export const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!['general', 'security', 'notifications', 'system'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const params = {
      TableName: SETTINGS_TABLE,
      FilterExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category
      }
    };

    const data = await docClient.send(new ScanCommand(params));
    
    const settings = {};
    if (data.Items) {
      data.Items.forEach(item => {
        settings[item.key] = item.value;
      });
    }

    res.status(200).json({ category, settings });

  } catch (error) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

// ============================================
// UPDATE SETTINGS BY CATEGORY
// ============================================
export const updateSettings = async (req, res) => {
  try {
    const { category } = req.params;
    const settingsData = req.body;

    if (!['general', 'security', 'notifications', 'system'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Save each setting individually
    const savePromises = Object.entries(settingsData).map(([key, value]) => {
      const settingId = `${category}_${key}`;
      return docClient.send(new PutCommand({
        TableName: SETTINGS_TABLE,
        Item: {
          settingId,
          category,
          key,
          value,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user?.id || 'admin'
        }
      }));
    });

    await Promise.all(savePromises);

    res.status(200).json({
      message: `${category} settings updated successfully`,
      category,
      settings: settingsData
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// ============================================
// GET ADMIN PROFILE
// ============================================
export const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const data = await docClient.send(new GetCommand(params));

    if (!data.Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = data.Item;
    res.status(200).json(userWithoutPassword);

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

// ============================================
// UPDATE ADMIN PROFILE
// ============================================
export const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, currentPassword, newPassword } = req.body;

    // Get current user data
    const getUserParams = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const userData = await docClient.send(new GetCommand(getUserParams));

    if (!userData.Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userData.Item;

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
    }

    // Build update expression
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name) {
      updateExpression.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }

    if (email && email !== user.email) {
      // Check if email already exists
      const scanParams = {
        TableName: USERS_TABLE,
        FilterExpression: 'email = :email AND userId <> :userId',
        ExpressionAttributeValues: {
          ':email': email,
          ':userId': userId
        }
      };

      const existingUsers = await docClient.send(new ScanCommand(scanParams));
      if (existingUsers.Items && existingUsers.Items.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      updateExpression.push('email = :email');
      expressionAttributeValues[':email'] = email;
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      updateExpression.push('password = :password');
      expressionAttributeValues[':password'] = hashedPassword;
    }

    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpression.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Update user
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(updateParams));

    const { password, ...updatedUser } = result.Attributes;
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// ============================================
// RESET SETTINGS TO DEFAULT
// ============================================
export const resetSettings = async (req, res) => {
  try {
    const { category } = req.params;

    if (!['general', 'security', 'notifications', 'system'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Get all settings for this category
    const scanParams = {
      TableName: SETTINGS_TABLE,
      FilterExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category
      }
    };

    const data = await docClient.send(new ScanCommand(scanParams));

    // Delete all settings in this category
    if (data.Items && data.Items.length > 0) {
      const deletePromises = data.Items.map(item => 
        docClient.send(new DeleteCommand({
          TableName: SETTINGS_TABLE,
          Key: { settingId: item.settingId }
        }))
      );
      await Promise.all(deletePromises);
    }

    res.status(200).json({
      message: `${category} settings reset to default`,
      category
    });

  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ message: 'Failed to reset settings', error: error.message });
  }
};