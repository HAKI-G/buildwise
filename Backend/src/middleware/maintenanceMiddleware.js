import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Cache maintenance status to reduce DB queries
let maintenanceCache = {
  value: false,
  lastChecked: 0,
  cacheDuration: 30000 // 30 seconds
};

export const checkMaintenanceMode = async (req, res, next) => {
  try {
    const now = Date.now();
    
    // Use cache if still valid
    if (now - maintenanceCache.lastChecked < maintenanceCache.cacheDuration) {
      if (maintenanceCache.value && req.user?.role !== 'Admin') {
        return res.status(503).json({
          message: 'Application is currently under maintenance. Please try again later.',
          maintenanceMode: true
        });
      }
      return next();
    }

    // Fetch fresh data from DB
    const params = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: {
        '#key': 'key'
      },
      ExpressionAttributeValues: {
        ':category': 'system',
        ':key': 'maintenanceMode'
      }
    };

    const data = await docClient.send(new ScanCommand(params));
    const maintenanceMode = data.Items?.[0]?.value === true || data.Items?.[0]?.value === 'true';

    // Update cache
    maintenanceCache = {
      value: maintenanceMode,
      lastChecked: now,
      cacheDuration: 30000
    };

    console.log(`🔧 Maintenance Mode: ${maintenanceMode ? 'ON' : 'OFF'} | User: ${req.user?.email || 'N/A'} | Role: ${req.user?.role || 'N/A'}`);

    // If maintenance mode is ON and user is NOT admin
    if (maintenanceMode && req.user?.role !== 'Admin') {
      return res.status(503).json({
        message: 'Application is currently under maintenance. Please try again later.',
        maintenanceMode: true
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error checking maintenance mode:', error);
    next(); // Allow request to continue on error
  }
};

// Helper function to clear cache (call this after updating maintenance mode)
export const clearMaintenanceCache = () => {
  maintenanceCache = {
    value: false,
    lastChecked: 0,
    cacheDuration: 30000
  };
  console.log('🔄 Maintenance cache cleared');
};