import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = "BuildWiseNotifications";
const USERS_TABLE = "BuildWiseUsers";

// ============================================
// 🗺️ MAP NOTIFICATION TYPES → PREFERENCE CATEGORIES
// ============================================
const TYPE_TO_PREFERENCE = {
  project_created:   'projectUpdates',
  project_updated:   'projectUpdates',
  project_status:    'projectUpdates',
  project_deleted:   'projectUpdates',
  milestone_created: 'milestoneDeadlines',
  phase_created:     'milestoneDeadlines',
  phase_completed:   'milestoneDeadlines',
  expense:           'expenseAlerts',
  budget_alert:      'expenseAlerts',
  comment:           'teamMessages',
  team_message:      'teamMessages',
  system:            'systemAnnouncements',
  maintenance:       'systemAnnouncements',
};

/**
 * Check if a user's preferences allow this notification type.
 * Defaults to true (send) if user has no preferences saved yet.
 */
const userAllowsNotification = (user, type, channel = 'inApp') => {
  const prefs = user.notificationPreferences;
  if (!prefs) return true; // no prefs saved → default allow all
  const category = TYPE_TO_PREFERENCE[type];
  if (!category) return true; // unknown type → allow
  const key = `${channel}_${category}`;
  // Explicitly check for false — undefined/missing means enabled
  return prefs[key] !== false;
};

// ============================================
// 🎯 ONE FUNCTION TO RULE THEM ALL
// ============================================
export const sendNotification = async (type, title, message, metadata = {}, specificUserId = null) => {
  try {
    // Helper to create a single notification record
    const createNotification = (userId) => {
      const timestamp = Date.now();
      const notificationId = `notif-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      return docClient.send(new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: {
          userId,
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
    };

    // If specificUserId provided, send to that user only (after checking prefs)
    if (specificUserId) {
      // Fetch user prefs
      const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
      const userData = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: specificUserId }
      }));
      const user = userData.Item;

      if (user && !userAllowsNotification(user, type, 'inApp')) {
        console.log(`⏭️ Notification skipped for ${specificUserId} (preference disabled: ${type})`);
        return;
      }

      await createNotification(specificUserId);
      console.log(`✅ Notification sent to user: ${specificUserId}`);
      return;
    }

    // Otherwise, send to all users who have the preference enabled
    const usersData = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
    const allUsers = usersData.Items || [];

    // Filter users based on their notification preferences
    const eligibleUsers = allUsers.filter(user => userAllowsNotification(user, type, 'inApp'));

    const notificationPromises = eligibleUsers.map(user => createNotification(user.userId));
    await Promise.all(notificationPromises);

    const skipped = allUsers.length - eligibleUsers.length;
    console.log(`✅ Notification sent to ${eligibleUsers.length} users${skipped > 0 ? ` (${skipped} skipped by preference)` : ''}`);

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
// DELETE A NOTIFICATION
// ============================================
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ message: 'notificationId is required' });
    }

    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    await docClient.send(new DeleteCommand({
      TableName: NOTIFICATIONS_TABLE,
      Key: {
        userId: userId,
        notificationId: notificationId
      }
    }));

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
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