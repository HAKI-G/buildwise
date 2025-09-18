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
const tableName = 'BuildWiseProgressUpdates';

// --- Controller Functions ---

/**
 * @desc    Create a new progress update for a milestone
 * @route   POST /api/updates/:milestoneId
 * @access  Private (Requires Token)
 */
export const createProgressUpdate = async (req, res) => {
  const { milestoneId } = req.params;
  // We will get the userId from the authenticated user in a future step (middleware)
  const { description, percentageComplete, userId } = req.body;
  const updateId = uuidv4();

  if (!description || percentageComplete === undefined || !userId) {
    return res.status(400).json({ message: "Please provide description, percentageComplete, and userId." });
  }

  const params = {
    TableName: tableName,
    Item: {
      milestoneId: milestoneId, // Partition Key
      updateId: updateId,       // Sort Key
      description,
      percentageComplete,
      userId, // Who submitted the update
      status: "Submitted", // Initial status
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({
      message: 'Progress update created successfully!',
      update: params.Item
    });
  } catch (error) {
    console.error(`Error creating progress update:`, error);
    res.status(500).json({ message: "Failed to create progress update", error: error.message });
  }
};

/**
 * @desc    Get all progress updates for a specific milestone
 * @route   GET /api/updates/:milestoneId
 * @access  Private (Requires Token)
 */
export const getUpdatesForMilestone = async (req, res) => {
    const { milestoneId } = req.params;

    const params = {
        TableName: tableName,
        KeyConditionExpression: "milestoneId = :milestoneId",
        ExpressionAttributeValues: {
            ":milestoneId": milestoneId,
        },
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        res.status(200).json(data.Items);
    } catch (error) {
        console.error(`Error fetching updates for milestone ${milestoneId}:`, error);
        res.status(500).json({ message: "Failed to fetch progress updates", error: error.message });
    }
};
