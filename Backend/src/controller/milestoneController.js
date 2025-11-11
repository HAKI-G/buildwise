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
    priority,        // ✅ ADDED: Extract priority field
    plannedCost,
    resourceRequirements,
    isPhase,
    isKeyMilestone,
    phaseColor
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
      priority: priority || 'Medium',  // ✅ ADDED: Save priority to DynamoDB
      plannedCost: plannedCost || 0,
      resourceRequirements: resourceRequirements || '',
      isPhase: isPhase || false,
      isKeyMilestone: isKeyMilestone || false,
      phaseColor: phaseColor || '#3B82F6',
      completedAt: null,
      createdAt: now,
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
    const data = await docClient.send(new QueryCommand(params));
    
    const sortedItems = (data.Items || []).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    res.status(200).json(sortedItems);
  } catch (error) {
    console.error(`Error fetching milestones for project ${projectId}:`, error);
    res.status(500).json({ 
      message: "Failed to fetch milestones", 
      error: error.message 
    });
  }
};

// Check if phase can be completed
export const canCompletePhase = async (req, res) => {
  const { projectId, phaseId } = req.params;
  
  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
    };
    
    const data = await docClient.send(new QueryCommand(params));
    const milestones = data.Items || [];
    
    const tasksInPhase = milestones.filter(m => 
      m.parentPhase === phaseId && m.isPhase !== true
    );
    
    const allTasksCompleted = tasksInPhase.length > 0 && 
      tasksInPhase.every(task => task.status === 'completed');
    
    const completedTasks = tasksInPhase.filter(t => t.status === 'completed').length;
    
    res.status(200).json({
      canComplete: allTasksCompleted,
      totalTasks: tasksInPhase.length,
      completedTasks: completedTasks,
      pendingTasks: tasksInPhase.length - completedTasks
    });
  } catch (error) {
    console.error("Error checking phase completion:", error);
    res.status(500).json({ 
      message: "Failed to check phase status", 
      error: error.message 
    });
  }
};

// Complete a phase (with validation)
export const completePhase = async (req, res) => {
  const { projectId, phaseId } = req.params;
  
  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
    };
    
    const data = await docClient.send(new QueryCommand(params));
    const milestones = data.Items || [];
    
    const tasksInPhase = milestones.filter(m => 
      m.parentPhase === phaseId && m.isPhase !== true
    );
    
    const allTasksCompleted = tasksInPhase.length > 0 && 
      tasksInPhase.every(task => task.status === 'completed');
    
    if (!allTasksCompleted) {
      return res.status(400).json({ 
        message: "Cannot complete phase - not all tasks are completed",
        totalTasks: tasksInPhase.length,
        completedTasks: tasksInPhase.filter(t => t.status === 'completed').length
      });
    }
    
    const now = new Date().toISOString();
    const updateParams = {
      TableName: tableName,
      Key: {
        projectId,
        milestoneId: phaseId
      },
      UpdateExpression: 'SET #status = :completed, completedAt = :now, updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':completed': 'completed',
        ':now': now
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await docClient.send(new UpdateCommand(updateParams));
    
    res.status(200).json({ 
      message: 'Phase completed successfully!', 
      phase: result.Attributes 
    });
  } catch (error) {
    console.error("Error completing phase:", error);
    res.status(500).json({ 
      message: "Failed to complete phase", 
      error: error.message 
    });
  }
};

// PUT /api/milestones/:projectId/:milestoneId
export const updateMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;
  const updateData = req.body;
  
  delete updateData.projectId;
  delete updateData.milestoneId;
  delete updateData.createdAt;
  
  // If status is being set to 'completed', add completedAt timestamp
  if (updateData.status === 'completed' && !updateData.completedAt) {
    updateData.completedAt = new Date().toISOString();
  }
  
  // If status is NOT completed, remove completedAt
  if (updateData.status && updateData.status !== 'completed') {
    updateData.completedAt = null;
  }
  
  updateData.updatedAt = new Date().toISOString();
  
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