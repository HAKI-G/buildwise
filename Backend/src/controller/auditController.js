// auditController.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "BuildWiseAuditLogs";

// 🟢 Create a new audit log
export const createAuditLog = async (req, res) => {
  try {
    const { userId, action, description } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ message: "userId and action are required" });
    }

    const timestamp = Date.now();
    const logId = `log-${timestamp}`;

    const params = {
      TableName: TABLE_NAME,
      Item: {
        logId,
        userId,
        action,
        description,
        timestamp,
        isArchived: 'false', // ✅ STRING instead of boolean
        archivedAt: null,
        archivedBy: null
      },
    };

    await docClient.send(new PutCommand(params));

    res.status(201).json({
      message: "Audit log created successfully",
      log: params.Item,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    res.status(500).json({ message: "Failed to create audit log", error: error.message });
  }
};

// 🟢 Get all audit logs
export const getAuditLogs = async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const data = await docClient.send(new ScanCommand(params));

    res.status(200).json({
      count: data.Items?.length || 0,
      logs: data.Items || [],
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
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
        ':isArchived': 'true', // ✅ STRING 'true' instead of boolean true
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
        ':isArchived': 'false', // ✅ STRING 'false' instead of boolean false
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
    console.log('   Request body:', JSON.stringify(req.body, null, 2));
    console.log('   Logs type:', typeof logs);
    console.log('   Is array?:', Array.isArray(logs));
    console.log('   Logs length:', logs?.length);
    console.log('   Admin ID:', adminId);

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ 
        message: 'logs array is required with format [{logId, timestamp}]'
      });
    }

    // Validate each log
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      console.log(`   Validating log ${i}:`, log);
      
      if (!log.logId || (!log.timestamp && log.timestamp !== 0)) {
        return res.status(400).json({ 
          message: `Log at index ${i} is missing logId or timestamp`,
          log: log
        });
      }
    }

    const archivedTimestamp = Date.now();
    const results = [];
    const errors = [];
    
    // Archive each log
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      console.log(`   [${i + 1}/${logs.length}] Archiving: ${log.logId} (timestamp: ${log.timestamp})`);
      
      try {
        const params = {
          TableName: TABLE_NAME,
          Key: { 
            logId: log.logId,
            timestamp: Number(log.timestamp)
          },
          UpdateExpression: 'SET isArchived = :isArchived, archivedAt = :archivedAt, archivedBy = :archivedBy',
          ExpressionAttributeValues: {
            ':isArchived': 'true', // ✅ STRING 'true' instead of boolean true
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

    console.log(`📊 Bulk archive summary:`);
    console.log(`   Total: ${logs.length}`);
    console.log(`   Successful: ${results.length}`);
    console.log(`   Failed: ${errors.length}`);

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




















