import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { autoUpdateProjectStatus } from './projectController.js';
import { sendMilestoneCompletionEmail } from '../services/emailService.js'; // ✅ ONLY NEW IMPORT

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
  const {
    projectId,
    milestoneName,
    description,
    startDate,
    targetDate,
    estimatedCost,
    priority,
    isPhase,
    parentPhase,
    phaseColor,
    isKeyMilestone
  } = req.body;

  if (!projectId || !milestoneName) {
    return res.status(400).json({ message: 'projectId and milestoneName are required.' });
  }

  const milestoneId = uuidv4();

  const params = {
    TableName: 'BuildWiseMilestones',
    Item: {
      projectId,
      milestoneId,
      milestoneName,
      description: description || '',
      startDate: startDate || null,
      targetDate: targetDate || null,
      dueDate: targetDate || null,
      endDate: targetDate || null,
      estimatedCost: estimatedCost || 0,
      priority: priority || 'Medium',
      status: 'not started',
      completionPercentage: 0,
      isPhase: isPhase || false,
      parentPhase: parentPhase || null,
      phaseColor: phaseColor || '#6B7280',
      isKeyMilestone: isKeyMilestone || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    await autoUpdateProjectStatus(projectId);
    res.status(201).json({
      message: 'Milestone created successfully',
      milestone: params.Item
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ message: 'Failed to create milestone', error: error.message });
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

// ✅ NEW: Update task completion percentage
export const updateTaskCompletion = async (req, res) => {
  const { projectId, taskId } = req.params;
  const { completionPercentage } = req.body;

  if (completionPercentage === undefined || completionPercentage < 0 || completionPercentage > 100) {
    return res.status(400).json({ message: 'Invalid completion percentage (must be 0-100)' });
  }

  const now = new Date().toISOString();
  const isCompleted = completionPercentage >= 100;

  try {
    const params = {
      TableName: tableName,
      Key: { projectId, milestoneId: taskId },
      UpdateExpression: `SET
        completionPercentage = :percentage,
        #status = :status,
        completedAt = :completedAt,
        updatedAt = :now`,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':percentage': completionPercentage,
        ':status': isCompleted ? 'completed' : (completionPercentage > 0 ? 'in progress' : 'not started'),
        ':completedAt': isCompleted ? now : null,
        ':now': now
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));
    res.status(200).json({
      message: 'Task completion updated successfully!',
      task: result.Attributes
    });
  } catch (error) {
    console.error("Error updating task completion:", error);
    res.status(500).json({
      message: "Failed to update task completion",
      error: error.message
    });
  }
};

// ✅ NEW: Get overall project progress
export const getProjectProgress = async (req, res) => {
  const { projectId } = req.params;

  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
    };

    const data = await docClient.send(new QueryCommand(params));
    const allItems = data.Items || [];

    // Filter only tasks (not phases)
    const tasks = allItems.filter(item => item.isPhase !== true);

    if (tasks.length === 0) {
      return res.status(200).json({
        projectId,
        totalTasks: 0,
        averageCompletion: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        notStartedTasks: 0
      });
    }

    // Calculate statistics
    const totalCompletion = tasks.reduce((sum, task) => sum + (task.completionPercentage || 0), 0);
    const averageCompletion = Math.round(totalCompletion / tasks.length);

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not started').length;

    res.status(200).json({
      projectId,
      totalTasks: tasks.length,
      averageCompletion,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      tasks: tasks.map(t => ({
        taskId: t.milestoneId,
        taskName: t.milestoneName,
        completionPercentage: t.completionPercentage || 0,
        status: t.status
      }))
    });
  } catch (error) {
    console.error("Error calculating project progress:", error);
    res.status(500).json({
      message: "Failed to calculate project progress",
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
      tasksInPhase.every(task => (task.completionPercentage || 0) >= 100);

    const completedTasks = tasksInPhase.filter(t => (t.completionPercentage || 0) >= 100).length;

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
      tasksInPhase.every(task => (task.completionPercentage || 0) >= 100);

    if (!allTasksCompleted) {
      return res.status(400).json({
        message: "Cannot complete phase - not all tasks are 100% completed",
        totalTasks: tasksInPhase.length,
        completedTasks: tasksInPhase.filter(t => (t.completionPercentage || 0) >= 100).length
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

    // ✅ NEW: Send email notification for phase completion
    // ✅ FIXED: Send email notification for phase completion
try {
  const projectParams = {
    TableName: "BuildWiseProjects",
    Key: { projectId }
  };
  const projectResult = await docClient.send(new GetCommand(projectParams));

  if (projectResult.Item) {
    const project = projectResult.Item;
    
    // ✅ Check if user ID exists
    const userId = project.projectManagerId || project.createdBy;
    
    if (!userId) {
      console.log('⚠️ No project manager ID found, skipping phase email');
    } else {
      try {
        const userParams = {
          TableName: "BuildWiseUsers",
          Key: { userId }
        };
        const userResult = await docClient.send(new GetCommand(userParams));

        if (userResult.Item && userResult.Item.email) {
          await sendMilestoneCompletionEmail(
            userResult.Item.email,
            userResult.Item.name || userResult.Item.username || "Project Manager",
            project.projectName,
            result.Attributes.milestoneName + " (Phase)",
            result.Attributes.updatedAt
          );
          console.log("✅ Phase completion email sent to:", userResult.Item.email);
        } else {
          console.log('⚠️ User found but no email address');
        }
      } catch (userErr) {
        console.log('⚠️ User not found in database:', userId);
        // Don't crash, just log
      }
    }
  }
} catch (emailErr) {
  console.error("⚠️ Failed to send phase completion email:", emailErr.message);
  // Don't crash the request
}


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
  const updates = req.body;

  if (!projectId || !milestoneId) {
    return res.status(400).json({ message: 'projectId and milestoneId are required.' });
  }

  try {
    const getParams = {
      TableName: 'BuildWiseMilestones',
      Key: { projectId, milestoneId }
    };

    const result = await docClient.send(new GetCommand(getParams));

    if (!result.Item) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // ✅ NEW: Check if milestone was just completed
    const oldMilestone = result.Item;
    const wasCompleted = oldMilestone.status === "completed";
    const isNowCompleted = updates.status === "completed" || (updates.completionPercentage && updates.completionPercentage >= 100);

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      updateExpressions.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = updates[key];
    });

    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateParams = {
      TableName: 'BuildWiseMilestones',
      Key: { projectId, milestoneId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const updateResult = await docClient.send(new UpdateCommand(updateParams));

    await autoUpdateProjectStatus(projectId);

    // ✅ NEW: Send email if milestone just completed
    // ✅ Send email if newly completed
    if (!wasCompleted && isNowCompleted) {
      try {
        const projectParams = {
          TableName: "BuildWiseProjects",
          Key: { projectId }
        };
        const projectResult = await docClient.send(new GetCommand(projectParams));

        if (projectResult.Item) {
          const project = projectResult.Item;
          
          // ✅ FIXED: Check if user exists before trying to get them
          const userId = project.projectManagerId || project.createdBy;
          
          if (!userId) {
            console.log('⚠️ No project manager ID found, skipping email');
            return;  // Skip email if no manager assigned
          }

          try {
            const userParams = {
              TableName: "BuildWiseUsers",
              Key: { userId }
            };
            const userResult = await docClient.send(new GetCommand(userParams));

            if (userResult.Item && userResult.Item.email) {
              await sendMilestoneCompletionEmail(
                userResult.Item.email,
                userResult.Item.name || userResult.Item.username || "Project Manager",
                project.projectName,
                updateResult.Attributes.milestoneName,
                updateResult.Attributes.updatedAt
              );
              console.log("✅ Milestone completion email sent to:", userResult.Item.email);
            } else {
              console.log('⚠️ User found but no email address');
            }
          } catch (userErr) {
            console.log('⚠️ User not found in database:', userId);
            // Don't throw error, just log it
          }
        }
      } catch (emailErr) {
        console.error("⚠️ Failed to send milestone completion email:", emailErr.message);
        // Don't crash the request, just log the error
      }
    }


    res.status(200).json({
      message: 'Milestone updated successfully',
      milestone: updateResult.Attributes
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ message: 'Failed to update milestone', error: error.message });
  }
};

// DELETE /api/milestones/:projectId/:milestoneId
export const deleteMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;

  if (!projectId || !milestoneId) {
    return res.status(400).json({ message: 'projectId and milestoneId are required.' });
  }

  const params = {
    TableName: 'BuildWiseMilestones',
    Key: { projectId, milestoneId }
  };

  try {
    await docClient.send(new DeleteCommand(params));
    await autoUpdateProjectStatus(projectId);
    res.status(200).json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ message: 'Failed to delete milestone', error: error.message });
  }
};
