import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

// --- AWS DynamoDB Client Setup ---
const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseComments';

// --- Controller Functions ---

/**
 * @desc      Create a new comment on a progress update
 * @route     POST /api/comments/:updateId
 * @access    Private (Requires Token)
 */
export const createComment = async (req, res) => {
  const { updateId } = req.params;
  const { commentText, userId, userName } = req.body; // userId will eventually come from auth middleware
  const commentId = uuidv4();

  if (!commentText || !userId) {
    return res.status(400).json({ message: "Please provide comment text and userId." });
  }

  const params = {
    TableName: tableName,
    Item: {
      updateId: updateId,   // Partition Key
      commentId: commentId, // Sort Key
      commentText,
      userId, // Who posted the comment
      userName: userName || 'Unknown User', // ✅ Save userName
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({
      message: 'Comment posted successfully!',
      comment: params.Item
    });
  } catch (error) {
    // FIX: Corrected the syntax for console.error
    console.error('Error creating comment:', error);
    res.status(500).json({ message: "Failed to post comment", error: error.message });
  }
};

/**
 * @desc      Get all comments for a specific progress update
 * @route     GET /api/comments/:updateId
 * @access    Private (Requires Token)
 */
export const getCommentsForUpdate = async (req, res) => {
    const { updateId } = req.params;

    const params = {
        TableName: tableName,
        KeyConditionExpression: "updateId = :updateId",
        ExpressionAttributeValues: {
            ":updateId": updateId,
        },
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        res.status(200).json(data.Items);
    } catch (error) {
        // FIX: Used backticks (`) for the template literal and corrected the overall syntax
        console.error(`Error fetching comments for update ${updateId}:`, error);
        res.status(500).json({ message: "Failed to fetch comments", error: error.message });
    }
};