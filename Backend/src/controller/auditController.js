// auditController.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "BuildWiseAuditLogs";

// ✅ Helper function to get user name from userId
const getUserName = async (userId) => {
  try {
    const params = {
      TableName: "BuildWiseUsers",
      Key: { userId }
    };
    const result = await docClient.send(new GetCommand(params));
    return result.Item?.name || 'Unknown User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'Unknown User';
  }
};

// ✅ NEW: Helper function to create audit log (called from other controllers)
export const logAudit = async (logData) => {
  try {
    const { userId, action, actionDescription, targetType, targetId, changes } = logData;
    
    // Get the actual user name
    const userName = await getUserName(userId);

    const timestamp = Date.now();
    const logId = `log-${timestamp}`;

    const auditLog = {
      logId,
      userId,
      userName, // ✅ Include real user name
      action,
      description: actionDescription || action,
      actionDescription: actionDescription || action,
      targetType: targetType || 'unknown',
      targetId: targetId || '',
      changes: changes || {},
      timestamp,
      isArchived: 'false',
      archivedAt: null,
      archivedBy: null,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: auditLog
    }));

    console.log('✅ Audit log created:', action, 'by', userName);
    return auditLog;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw - we don't want audit logging to break main operations
    return null;
  }
};

// 🟢 Create a new audit log (API endpoint)
export const createAuditLog = async (req, res) => {
  try {
    const { userId, action, description } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ message: "userId and action are required" });
    }

    const result = await logAudit({
      userId,
      action,
      actionDescription: description
    });

    if (result) {
      res.status(201).json({
        message: "Audit log created successfully",
        log: result,
      });
    } else {
      res.status(500).json({ message: "Failed to create audit log" });
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
    res.status(500).json({ message: "Failed to create audit log", error: error.message });
  }
};

// 🟢 Get all audit logs - ✅ UPDATED
export const getAuditLogs = async (req, res) => {
  try {
    const { limit } = req.query;

    const params = {
      TableName: TABLE_NAME,
    };

    console.log('📋 Fetching audit logs from DynamoDB...');
    const data = await docClient.send(new ScanCommand(params));
    console.log(`   Found ${data.Items?.length || 0} total logs`);

    // ✅ Filter out archived logs and sort by timestamp descending
    const activeLogs = (data.Items || [])
      .filter(log => {
        const isArchived = log.isArchived === 'true' || log.isArchived === true;
        return !isArchived; // Only non-archived logs
      })
      .sort((a, b) => {
        // Sort by timestamp (newest first)
        const timeA = Number(a.timestamp) || new Date(a.createdAt).getTime() || 0;
        const timeB = Number(b.timestamp) || new Date(b.createdAt).getTime() || 0;
        return timeB - timeA; // Descending (newest first)
      });

    console.log(`   Active logs after filtering: ${activeLogs.length}`);

    // Apply limit after filtering
    const limitedLogs = limit ? activeLogs.slice(0, parseInt(limit)) : activeLogs;

    console.log(`   Returning ${limitedLogs.length} logs (newest first)`);
    
    // Log first few for debugging
    if (limitedLogs.length > 0) {
      console.log('   First log:', {
        action: limitedLogs[0].action,
        userName: limitedLogs[0].userName,
        timestamp: new Date(limitedLogs[0].timestamp).toISOString()
      });
    }

    res.status(200).json({
      count: limitedLogs.length,
      logs: limitedLogs,
    });
  } catch (error) {
    console.error("❌ Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs", error: error.message });
  }
};

// 🟢 Get audit logs by userId
export const getAuditLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": userId,
      },
    };

    const data = await docClient.send(new ScanCommand(params));

    res.status(200).json({
      count: data.Items?.length || 0,
      logs: data.Items || [],
    });
  } catch (error) {
    console.error("Error fetching audit logs by user:", error);
    res.status(500).json({ message: "Failed to fetch audit logs by user", error: error.message });
  }
};

// ✅ Archive a log
export const archiveLog = async (req, res) => {
  try {
    const { logId, timestamp } = req.body;
    const adminId = req.user?.id;

    console.log('📦 Archive request received');
    console.log('   logId:', logId);
    console.log('   timestamp:', timestamp);

    if (!logId || !timestamp) {
      return res.status(400).json({ message: "logId and timestamp are required" });
    }

    const archivedTimestamp = Date.now();

    const params = {
      TableName: TABLE_NAME,
      Key: { 
        logId: logId,
        timestamp: Number(timestamp)
      },
      UpdateExpression: 'SET isArchived = :isArchived, archivedAt = :archivedAt, archivedBy = :archivedBy',
      ExpressionAttributeValues: {
        ':isArchived': 'true',
        ':archivedAt': archivedTimestamp,
        ':archivedBy': adminId || 'admin'
      },
      ReturnValues: 'ALL_NEW'
    };

    console.log('   Sending update command...');
    const result = await docClient.send(new UpdateCommand(params));
    console.log('✅ Archive successful');

    res.status(200).json({
      message: 'Log archived successfully',
      logId,
      updatedLog: result.Attributes
    });

  } catch (error) {
    console.error('❌ Error archiving log:', error);
    console.error('   Error message:', error.message);
    
    res.status(500).json({ 
      message: 'Failed to archive log',
      error: error.message
    });
  }
};

// ✅ Unarchive a log
export const unarchiveLog = async (req, res) => {
  try {
    const { logId, timestamp } = req.body;

    console.log('📤 Unarchive request received');
    console.log('   logId:', logId);
    console.log('   timestamp:', timestamp);

    if (!logId || !timestamp) {
      return res.status(400).json({ message: "logId and timestamp are required" });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { 
        logId: logId,
        timestamp: Number(timestamp)
      },
      UpdateExpression: 'SET isArchived = :isArchived, archivedAt = :archivedAt, archivedBy = :archivedBy',
      ExpressionAttributeValues: {
        ':isArchived': 'false',
        ':archivedAt': null,
        ':archivedBy': null
      },
      ReturnValues: 'ALL_NEW'
    };

    console.log('   Sending update command...');
    const result = await docClient.send(new UpdateCommand(params));
    console.log('✅ Unarchive successful');

    res.status(200).json({
      message: 'Log unarchived successfully',
      logId,
      updatedLog: result.Attributes
    });

  } catch (error) {
    console.error('❌ Error unarchiving log:', error);
    
    res.status(500).json({ 
      message: 'Failed to unarchive log',
      error: error.message 
    });
  }
};

// ✅ Bulk archive logs
export const bulkArchiveLogs = async (req, res) => {
  try {
    const { logs } = req.body;
    const adminId = req.user?.id;

    console.log('📦 Bulk archive request received');
    console.log('   Logs length:', logs?.length);

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ 
        message: 'logs array is required with format [{logId, timestamp}]'
      });
    }

    const archivedTimestamp = Date.now();
    const results = [];
    const errors = [];
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      console.log(`   [${i + 1}/${logs.length}] Archiving: ${log.logId}`);
      
      try {
        const params = {
          TableName: TABLE_NAME,
          Key: { 
            logId: log.logId,
            timestamp: Number(log.timestamp)
          },
          UpdateExpression: 'SET isArchived = :isArchived, archivedAt = :archivedAt, archivedBy = :archivedBy',
          ExpressionAttributeValues: {
            ':isArchived': 'true',
            ':archivedAt': archivedTimestamp,
            ':archivedBy': adminId || 'admin'
          }
        };

        await docClient.send(new UpdateCommand(params));
        results.push({ logId: log.logId, status: 'success' });
        console.log(`   ✅ Successfully archived: ${log.logId}`);
      } catch (itemError) {
        console.error(`   ❌ Failed to archive ${log.logId}:`, itemError.message);
        errors.push({ 
          logId: log.logId, 
          error: itemError.message
        });
      }
    }

    console.log(`📊 Bulk archive summary: ${results.length} succeeded, ${errors.length} failed`);

    if (errors.length === 0) {
      res.status(200).json({
        message: `Successfully archived ${results.length} logs`,
        count: results.length,
        results: results
      });
    } else if (results.length === 0) {
      res.status(500).json({
        message: 'Failed to archive all logs',
        count: 0,
        errors: errors
      });
    } else {
      res.status(207).json({
        message: `Partially successful: ${results.length} succeeded, ${errors.length} failed`,
        successCount: results.length,
        failureCount: errors.length,
        results: results,
        errors: errors
      });
    }

  } catch (error) {
    console.error('❌ Fatal error in bulk archive:', error);
    
    res.status(500).json({ 
      message: 'Failed to bulk archive logs',
      error: error.message
    });
  }
};