import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseMilestones';

// POST /api/milestones
export const createMilestone = async (req, res) => {
  // The projectId will come from the URL params
  const { projectId } = req.params;
  // The milestone details will come from the request body
  const { milestoneName, description, targetDate } = req.body;
  const milestoneId = uuidv4();

  const params = {
    TableName: tableName,
    Item: {
      projectId, // Partition Key
      milestoneId, // Sort Key
      milestoneName,
      description,
      targetDate,
      status: 'Not Started',
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({ message: 'Milestone created successfully!', milestone: params.Item });
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({ message: "Failed to create milestone", error: error.message });
  }
};

// GET /api/milestones/:projectId
export const getMilestonesForProject = async (req, res) => {
  const { projectId } = req.params;
  const params = {
    TableName: tableName,
    KeyConditionExpression: "projectId = :pid",
    ExpressionAttributeValues: {
      ":pid": projectId,
    },
  };

  try {
    // We use a Query here for efficiency, thanks to our PK/SK structure
    const data = await docClient.send(new QueryCommand(params));
    res.status(200).json(data.Items);
  } catch (error) {
    console.error(`Error fetching milestones for project ${projectId}:`, error);
    res.status(500).json({ message: "Failed to fetch milestones", error: error.message });
  }
};