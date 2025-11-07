import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = "BuildWiseNotifications";

// ============================================
// 🎯 ONE FUNCTION TO RULE THEM ALL
// ============================================
export const sendNotification = async (type, title, message, metadata = {}, specificUserId = null) => {
  try {
    // If specificUserId provided, send to that user only
    if (specificUserId) {
      const timestamp = Date.now();
      const notificationId = `notif-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

      await docClient.send(new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: {
          userId: specificUserId,
          notificationId,
          type,
          title,
          message,
          metadata,
          timestamp,
          read: false,
          createdAt: new Date().toISOString()
        }
      }));

      console.log(`✅ Notification sent to user: ${specificUserId}`);
      return;
    }

    // Otherwise, send to ALL users
    const usersParams = {
      TableName: "BuildWiseUsers"
    };

    const usersData = await docClient.send(new ScanCommand(usersParams));
    const allUsers = usersData.Items || [];

    // Send notification to EVERY user
    const notificationPromises = allUsers.map(user => {
      const timestamp = Date.now();
      const notificationId = `notif-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

      return docClient.send(new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: {
          userId: user.userId,
          notificationId,
          type,
          title,
          message,
          metadata,
          timestamp,
          read: false,
          createdAt: new Date().toISOString()
        }
      }));
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Notification sent to ${allUsers.length} users`);

  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
};

// ============================================
// GET NOTIFICATIONS FOR USER
// ============================================
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, unreadOnly = false } = req.query;

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      Limit: parseInt(limit),
      ScanIndexForward: false
    };

    const data = await docClient.send(new QueryCommand(params));
    let notifications = data.Items || [];

    notifications = notifications.sort((a, b) => b.timestamp - a.timestamp);

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    res.status(200).json({
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// ============================================
// MARK AS READ
// ============================================
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.user.id;

    if (!notificationId) {
      return res.status(400).json({ message: 'notificationId is required' });
    }

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Key: {
        userId: userId,
        notificationId: notificationId
      },
      UpdateExpression: 'SET #read = :read, readAt = :readAt',
      ExpressionAttributeNames: {
        '#read': 'read'
      },
      ExpressionAttributeValues: {
        ':read': true,
        ':readAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));

    res.status(200).json({
      message: 'Notification marked as read',
      notification: result.Attributes
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// ============================================
// MARK ALL AS READ
// ============================================
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const queryParams = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "#read = :read",
      ExpressionAttributeNames: {
        '#read': 'read'
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":read": false
      }
    };

    const data = await docClient.send(new QueryCommand(queryParams));
    const notifications = data.Items || [];

    const updatePromises = notifications.map(notification => {
      return docClient.send(new UpdateCommand({
        TableName: NOTIFICATIONS_TABLE,
        Key: {
          userId: userId,
          notificationId: notification.notificationId
        },
        UpdateExpression: 'SET #read = :read, readAt = :readAt',
        ExpressionAttributeNames: {
          '#read': 'read'
        },
        ExpressionAttributeValues: {
          ':read': true,
          ':readAt': new Date().toISOString()
        }
      }));
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      message: 'All notifications marked as read',
      count: notifications.length
    });

  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};