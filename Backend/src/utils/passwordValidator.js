import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Get security settings from database
const getSecuritySettings = async () => {
  try {
    const params = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category",
      ExpressionAttributeValues: { ':category': 'security' }
    };
    
    const data = await docClient.send(new ScanCommand(params));
    
    // Convert array of settings to object
    const settings = {};
    (data.Items || []).forEach(item => {
      settings[item.key] = item.value;
    });
    
    // Default values if not set
    return {
      passwordMinLength: settings.passwordMinLength || 8,
      requireSpecialChar: settings.requireSpecialChar !== false,
      requireNumber: settings.requireNumber !== false,
      requireUppercase: settings.requireUppercase !== false,
      maxLoginAttempts: settings.maxLoginAttempts || 5
    };
  } catch (error) {
    console.error('Error fetching security settings:', error);
    // Return defaults on error
    return {
      passwordMinLength: 8,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true,
      maxLoginAttempts: 5
    };
  }
};

// Validate password against security settings
export const validatePassword = async (password) => {
  const settings = await getSecuritySettings();
  const errors = [];

  // Check minimum length
  if (password.length < settings.passwordMinLength) {
    errors.push(`Password must be at least ${settings.passwordMinLength} characters long`);
  }

  // Check for special character
  if (settings.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  // Check for number
  if (settings.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // Check for uppercase letter
  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    settings
  };
};

// Get password strength
export const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};

export default { validatePassword, getPasswordStrength, getSecuritySettings };