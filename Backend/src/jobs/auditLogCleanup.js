import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const cleanupOldAuditLogs = async () => {
  try {
    console.log('🧹 Starting audit log cleanup...');

    // Get retention setting
    const settingsParams = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: {
        '#key': 'key'
      },
      ExpressionAttributeValues: {
        ':category': 'system',
        ':key': 'auditLogRetention'
      }
    };

    const settingsData = await docClient.send(new ScanCommand(settingsParams));
    const retentionDays = settingsData.Items?.[0]?.value || 90;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffTimestamp = cutoffDate.toISOString();

    console.log(`📅 Archiving logs older than ${retentionDays} days (before ${cutoffTimestamp})`);

    // Get old logs
    const logsParams = {
      TableName: "BuildWiseAuditLogs",
      FilterExpression: "#timestamp < :cutoff AND (attribute_not_exists(isArchived) OR isArchived <> :true)",
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':cutoff': cutoffTimestamp,
        ':true': 'true'
      }
    };

    const logsData = await docClient.send(new ScanCommand(logsParams));
    const oldLogs = logsData.Items || [];

    console.log(`📦 Found ${oldLogs.length} logs to archive`);

    // Archive each log
    const archivePromises = oldLogs.map(log =>
      docClient.send(new UpdateCommand({
        TableName: "BuildWiseAuditLogs",
        Key: {
          logId: log.logId,
          timestamp: log.timestamp
        },
        UpdateExpression: 'SET isArchived = :true, archivedAt = :archivedAt',
        ExpressionAttributeValues: {
          ':true': 'true',
          ':archivedAt': new Date().toISOString()
        }
      }))
    );

    await Promise.all(archivePromises);

    console.log(`✅ Successfully archived ${oldLogs.length} audit logs`);

  } catch (error) {
    console.error('❌ Error cleaning up audit logs:', error);
  }
};

// Run every day at midnight
export const scheduleAuditLogCleanup = () => {
  // Run immediately on startup
  cleanupOldAuditLogs();

  // Then run every 24 hours
  setInterval(cleanupOldAuditLogs, 24 * 60 * 60 * 1000);
};