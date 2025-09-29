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

// POST /api/milestones/:projectId
export const createMilestone = async (req, res) => {
  const { projectId } = req.params;
  const { 
    milestoneName, 
    taskName,
    description, 
    targetDate,
    startDate,
    endDate,
    parentPhase,
    status,
    assignedTo,
    plannedCost,
    resourceRequirements,
    isPhase,
    isKeyMilestone,
    phaseColor // IMPORTANT: Add phaseColor support
  } = req.body;
  
  const milestoneId = uuidv4();
  const now = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      projectId,
      milestoneId,
      milestoneName: milestoneName || taskName,
      description: description || '',
      targetDate: targetDate || endDate,
      startDate: startDate || now,
      endDate: endDate || targetDate,
      parentPhase: parentPhase || null,
      status: status || 'not started',
      assignedTo: assignedTo || 'Unassigned',
      plannedCost: plannedCost || 0,
      resourceRequirements: resourceRequirements || '',
      isPhase: isPhase || false,
      isKeyMilestone: isKeyMilestone || false,
      phaseColor: phaseColor || '#3B82F6', // FIXED: Store phase color
      createdAt: now, // CRITICAL: Use timestamp for ordering
      updatedAt: now
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({ 
      message: 'Milestone/Task created successfully!', 
      milestone: params.Item 
    });
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({ 
      message: "Failed to create milestone", 
      error: error.message 
    });
  }
};

// GET /api/milestones/:projectId - FIXED: Proper sorting
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
    const data = await docClient.send(new QueryCommand(params));
    
    // FIXED: Sort by createdAt timestamp in ASCENDING order (oldest first)
    const sortedItems = (data.Items || []).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB; // Ascending order: oldest first
    });
    
    console.log('Fetched and sorted milestones:', sortedItems.map(item => ({
      name: item.milestoneName,
      createdAt: item.createdAt,
      isPhase: item.isPhase
    })));
    
    res.status(200).json(sortedItems);
  } catch (error) {
    console.error(`Error fetching milestones for project ${projectId}:`, error);
    res.status(500).json({ 
      message: "Failed to fetch milestones", 
      error: error.message 
    });
  }
};

// PUT /api/milestones/:projectId/:milestoneId
export const updateMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;
  const updateData = req.body;
  
  // Remove keys that shouldn't be updated
  delete updateData.projectId;
  delete updateData.milestoneId;
  delete updateData.createdAt; // IMPORTANT: Never update createdAt to preserve order
  
  // Add updatedAt
  updateData.updatedAt = new Date().toISOString();
  
  // Build update expression
  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  Object.keys(updateData).forEach((key, index) => {
    updateExpressions.push(`#attr${index} = :val${index}`);
    expressionAttributeNames[`#attr${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updateData[key];
  });
  
  const params = {
    TableName: tableName,
    Key: {
      projectId,
      milestoneId
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await docClient.send(new UpdateCommand(params));
    res.status(200).json({ 
      message: 'Milestone updated successfully!', 
      milestone: result.Attributes 
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ 
      message: "Failed to update milestone", 
      error: error.message 
    });
  }
};

// DELETE /api/milestones/:projectId/:milestoneId
export const deleteMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;
  
  const params = {
    TableName: tableName,
    Key: {
      projectId,
      milestoneId
    }
  };

  try {
    await docClient.send(new DeleteCommand(params));
    res.status(200).json({ 
      message: 'Milestone deleted successfully!' 
    });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({ 
      message: "Failed to delete milestone", 
      error: error.message 
    });
  }
};