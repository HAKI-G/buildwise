import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "BuildWiseLoginAttempts";

// Record a failed login attempt
export const recordFailedAttempt = async (email, maxAttempts = 5) => {
  try {
    const now = Date.now();
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes

    // Get existing record
    const getParams = {
      TableName: TABLE_NAME,
      Key: { email }
    };
    
    const result = await docClient.send(new GetCommand(getParams));
    const existing = result.Item;

    if (existing) {
      // Check if account is locked
      if (existing.lockedUntil && existing.lockedUntil > now) {
        const remainingMinutes = Math.ceil((existing.lockedUntil - now) / 60000);
        return {
          isLocked: true,
          remainingMinutes,
          message: `Account locked. Try again in ${remainingMinutes} minute(s)`
        };
      }

      // Reset if last attempt was more than 1 hour ago
      const oneHourAgo = now - (60 * 60 * 1000);
      const attempts = existing.lastAttempt > oneHourAgo ? existing.attempts + 1 : 1;

      // Update attempts
      const updateParams = {
        TableName: TABLE_NAME,
        Key: { email },
        UpdateExpression: 'SET attempts = :attempts, lastAttempt = :now, lockedUntil = :lockedUntil',
        ExpressionAttributeValues: {
          ':attempts': attempts,
          ':now': now,
          ':lockedUntil': attempts >= maxAttempts ? now + lockoutDuration : null
        }
      };
      
      await docClient.send(new UpdateCommand(updateParams));

      if (attempts >= maxAttempts) {
        return {
          isLocked: true,
          remainingMinutes: 15,
          message: `Too many failed attempts. Account locked for 15 minutes`
        };
      }

      return {
        isLocked: false,
        attemptsRemaining: maxAttempts - attempts,
        message: `Invalid credentials. ${maxAttempts - attempts} attempt(s) remaining`
      };
    } else {
      // Create new record
      const putParams = {
        TableName: TABLE_NAME,
        Item: {
          email,
          attempts: 1,
          lastAttempt: now,
          lockedUntil: null
        }
      };
      
      await docClient.send(new PutCommand(putParams));

      return {
        isLocked: false,
        attemptsRemaining: maxAttempts - 1,
        message: `Invalid credentials. ${maxAttempts - 1} attempt(s) remaining`
      };
    }
  } catch (error) {
    console.error('Error recording failed attempt:', error);
    return {
      isLocked: false,
      message: 'Invalid credentials'
    };
  }
};

// Check if account is locked
export const isAccountLocked = async (email) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { email }
    };
    
    const result = await docClient.send(new GetCommand(params));
    const record = result.Item;

    if (!record) {
      return { isLocked: false };
    }

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return {
        isLocked: true,
        remainingMinutes,
        message: `Account locked. Try again in ${remainingMinutes} minute(s)`
      };
    }

    return { isLocked: false };
  } catch (error) {
    console.error('Error checking account lock:', error);
    return { isLocked: false };
  }
};

// Reset login attempts (after successful login)
export const resetAttempts = async (email) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { email },
      UpdateExpression: 'SET attempts = :zero, lockedUntil = :null',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':null': null
      }
    };
    
    await docClient.send(new UpdateCommand(params));
  } catch (error) {
    console.error('Error resetting attempts:', error);
  }
};

export default { recordFailedAttempt, isAccountLocked, resetAttempts };