import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { autoUpdateProjectStatus } from './projectController.js';
import { sendMilestoneCompletionEmail } from '../services/emailService.js';

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

// ✅ AUTO-UPDATE TASK STATUS based on photo confirmations
const autoUpdateTaskStatus = async (projectId, taskId) => {
  try {
    console.log(`📊 Auto-updating task status for task: ${taskId}`);
    
    // Get photos for this task - check both taskId and milestoneId fields
    const photosParams = {
      TableName: 'BuildWisePhotos',
      FilterExpression: 'projectId = :projectId AND (taskId = :taskId OR milestoneId = :taskId)',
      ExpressionAttributeValues: {
        ':projectId': projectId,
        ':taskId': taskId
      }
    };
    
    const photosResult = await docClient.send(new ScanCommand(photosParams));
    const photos = photosResult.Items || [];
    
    console.log(`📷 Found ${photos.length} photos for task ${taskId}`);
    
    if (photos.length === 0) {
      // No photos - task remains "not started"
      return { status: 'not started', completionPercentage: 0 };
    }
    
    // Filter photos by confirmation status
    const confirmedPhotos = photos.filter(p => 
      p.confirmationStatus === 'confirmed' && 
      p.userInputPercentage !== undefined &&
      p.userInputPercentage !== null
    );
    
    console.log(`✅ Found ${confirmedPhotos.length} confirmed photos with user input`);
    
    // ✅ FIXED: Sum up all percentages (accumulative) instead of averaging
    // This way: 36% + 45% = 81% (not 40.5% from averaging)
    let completionPercentage = 0;
    
    if (confirmedPhotos.length > 0) {
      const totalPercentage = confirmedPhotos.reduce((sum, photo) => {
        return sum + (parseFloat(photo.userInputPercentage) || 0);
      }, 0);
      // ✅ Accumulate percentages and cap at 100%
      completionPercentage = Math.min(Math.round(totalPercentage), 100);
    }
    
    // Determine status based on completion
    let status = 'not started';
    
    if (confirmedPhotos.length === 0) {
      // No confirmed photos - task not started
      status = 'not started';
      completionPercentage = 0;
    } else if (completionPercentage > 0 && completionPercentage < 100) {
      // Some progress - task in progress
      status = 'in progress';
    } else if (completionPercentage >= 100) {
      // Fully completed
      status = 'completed';
    }
    
    console.log(`📊 Task ${taskId} - Status: ${status}, Completion: ${completionPercentage}% (accumulated from ${confirmedPhotos.length} photos)`);
    
    return { status, completionPercentage };
    
  } catch (error) {
    console.error('Error auto-updating task status:', error);
    return null;
  }
};

// ✅ AUTO-CHECK PHASE COMPLETION based on task completion
const autoCheckPhaseCompletion = async (projectId, phaseId) => {
  try {
    const params = {
      TableName: tableName,
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: {
        ':pid': projectId
      }
    };
    
    const data = await docClient.send(new QueryCommand(params));
    const milestones = data.Items || [];
    
    // Get all tasks in this phase
    const tasksInPhase = milestones.filter(m => 
      m.parentPhase === phaseId && m.isPhase !== true
    );
    
    if (tasksInPhase.length === 0) {
      return { canComplete: false, shouldAutoComplete: false };
    }
    
    // Check if all tasks are completed (status = 'completed')
    const allTasksComplete = tasksInPhase.every(task => 
      task.status === 'completed'
    );
    
    return { 
      canComplete: allTasksComplete, 
      shouldAutoComplete: allTasksComplete,
      totalTasks: tasksInPhase.length,
      completedTasks: tasksInPhase.filter(t => t.status === 'completed').length
    };
    
  } catch (error) {
    console.error('Error checking phase completion:', error);
    return { canComplete: false, shouldAutoComplete: false };
  }
};

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
    TableName: tableName,
    Item: {
      projectId,
      milestoneId,
      milestoneName,
      description: description || '',
      startDate: startDate || null,
      targetDate: targetDate || null,
      dueDate: targetDate || null,
      endDate: targetDate || null,
      estimatedCost: parseFloat(estimatedCost) || 0,
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

// Update task completion percentage
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

// Get overall project progress
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

// ✅ Email helper with CORRECT table names
const sendCompletionEmail = async (projectId, milestoneName, completionType = "milestone", loggedInUserId = null) => {
  console.log(`\n🔍 === Starting ${completionType} email process ===`);
  console.log(`📋 Project ID: ${projectId}`);
  console.log(`📌 Milestone: ${milestoneName}`);
  console.log(`👤 Logged-in User ID: ${loggedInUserId}`);
  
  try {
    // 1. Get the user email from the logged-in user (not project manager)
    let userId = loggedInUserId;
    
    // If no logged-in user, fallback to project manager
    if (!userId) {
      console.log(`\n🔎 STEP 1: Fetching project...`);
      const projectParams = {
        TableName: "buildwiseProjects",
        Key: { projectId }
      };
      
      const projectResult = await docClient.send(new GetCommand(projectParams));
      
      if (!projectResult.Item) {
        console.log(`❌ Project not found: ${projectId}`);
        return false;
      }

      const project = projectResult.Item;
      userId = project.projectManagerId || project.createdBy || project.userId || project.ownerId;
    }
    
    if (!userId) {
      console.log(`❌ No user ID found`);
      return false;
    }

    console.log(`✅ User ID: ${userId}`);

    // 2. Fetch user
    console.log(`\n🔎 STEP 2: Fetching user...`);
    const userParams = {
      TableName: "BuildWiseUsers",
      Key: { userId }
    };
    
    const userResult = await docClient.send(new GetCommand(userParams));
    
    if (!userResult.Item) {
      console.log(`❌ User not found: ${userId}`);
      return false;
    }

    const user = userResult.Item;
    
    if (!user.email) {
      console.log(`❌ No email found`);
      return false;
    }

    console.log(`✅ Sending to: ${user.email}`);

    // 3. Send email
    await sendMilestoneCompletionEmail(
      user.email,
      user.name || user.username || "Project Manager",
      projectId, // Will fetch project name inside if needed
      milestoneName + (completionType === "phase" ? " (Phase)" : ""),
      new Date().toISOString()
    );

    console.log(`✅✅✅ Email sent successfully to ${user.email}!\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sending ${completionType} email:`, error.message);
    return false;
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

    // ✅ AWAIT and SEND email notification to logged-in user
    if (req.user?.id) {
      await sendCompletionEmail(projectId, result.Attributes.milestoneName, "phase", req.user.id);
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

// ✅ FIXED: PUT /api/milestones/:projectId/:milestoneId
// Now respects manual status updates from checkbox
export const updateMilestone = async (req, res) => {
  const { projectId, milestoneId } = req.params;
  const updates = req.body;

  if (!projectId || !milestoneId) {
    return res.status(400).json({ message: 'projectId and milestoneId are required.' });
  }

  try {
    const getParams = {
      TableName: tableName,
      Key: { projectId, milestoneId }
    };

    const result = await docClient.send(new GetCommand(getParams));

    if (!result.Item) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const oldMilestone = result.Item;
    const isTask = !oldMilestone.isPhase;
    
    // ✅ FIXED: Only auto-update when syncFromPhotos flag is present
    // This allows manual checkbox updates while keeping photo-based auto-updates
    if (isTask && updates.syncFromPhotos === true) {
      console.log(`📊 Syncing task status from photos (triggered by photo confirmation)`);
      
      const autoStatus = await autoUpdateTaskStatus(projectId, milestoneId);
      
      if (autoStatus) {
        console.log(`📊 Auto-calculated task status:`, autoStatus);
        
        // Override with calculated status only when explicitly syncing
        updates.status = autoStatus.status;
        updates.completionPercentage = autoStatus.completionPercentage;
        
        // Add completedAt timestamp if task just completed
        if (autoStatus.status === 'completed' && oldMilestone.status !== 'completed') {
          updates.completedAt = new Date().toISOString();
        }
      }
      
      // Remove the sync flag before saving
      delete updates.syncFromPhotos;
    }

    const wasCompleted = oldMilestone.status === "completed";
    const isNowCompleted = updates.status === "completed" || (updates.completionPercentage && updates.completionPercentage >= 100);

    // Add completedAt timestamp for manual completion
    if (!wasCompleted && isNowCompleted && !updates.completedAt) {
      updates.completedAt = new Date().toISOString();
    }

    // Clear completedAt if marking as incomplete
    if (wasCompleted && !isNowCompleted) {
      updates.completedAt = null;
    }

    // Build update expression with proper attribute name handling
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updates[key];
    });

    // Always update the updatedAt timestamp
    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateParams = {
      TableName: tableName,
      Key: { projectId, milestoneId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    console.log('📝 Updating milestone:', { projectId, milestoneId, updates });
    
    const updateResult = await docClient.send(new UpdateCommand(updateParams));
    
    console.log('✅ Milestone updated successfully');

    // ✅ AUTO-CHECK PHASE COMPLETION if this is a task
    if (isTask && oldMilestone.parentPhase) {
      const phaseCheck = await autoCheckPhaseCompletion(projectId, oldMilestone.parentPhase);
      
      if (phaseCheck.shouldAutoComplete) {
        console.log(`✅ All tasks in phase ${oldMilestone.parentPhase} are completed - Auto-completing phase!`);
        
        // Auto-complete the parent phase
        const phaseUpdateParams = {
          TableName: tableName,
          Key: { projectId, milestoneId: oldMilestone.parentPhase },
          UpdateExpression: 'SET #status = :completed, completedAt = :now, updatedAt = :now',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':completed': 'completed',
            ':now': new Date().toISOString()
          },
          ReturnValues: 'ALL_NEW'
        };
        
        const phaseResult = await docClient.send(new UpdateCommand(phaseUpdateParams));
        
        // Send phase completion email
        sendCompletionEmail(projectId, phaseResult.Attributes.milestoneName, "phase");
      }
    }

    await autoUpdateProjectStatus(projectId);

    // Send email if milestone just completed
    if (!wasCompleted && isNowCompleted) {
      sendCompletionEmail(projectId, updateResult.Attributes.milestoneName, isTask ? "milestone" : "phase");
    }

    res.status(200).json({
      message: 'Milestone updated successfully',
      milestone: updateResult.Attributes
    });
  } catch (error) {
    console.error('❌ Error updating milestone:', error);
    console.error('Error details:', error.message);
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
    TableName: tableName,
    Key: { projectId, milestoneId }
  };

  try {
    console.log(`🗑️ Attempting to delete milestone: ${milestoneId} from project: ${projectId}`);
    const result = await docClient.send(new DeleteCommand(params));
    console.log(`✅ Milestone deleted successfully:`, result);
    await autoUpdateProjectStatus(projectId);
    res.status(200).json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting milestone:', error);
    res.status(500).json({ message: 'Failed to delete milestone', error: error.message });
  }
};

// DELETE ALL milestones for a project (for cleanup)
export const deleteAllMilestones = async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId is required.' });
  }

  try {
    // First, get all milestones for this project
    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: {
        ':pid': projectId
      }
    };

    const data = await docClient.send(new QueryCommand(queryParams));
    const milestones = data.Items || [];

    console.log(`🗑️ Deleting ${milestones.length} milestones for project ${projectId}`);

    // Delete each milestone
    for (const milestone of milestones) {
      const deleteParams = {
        TableName: tableName,
        Key: { 
          projectId: milestone.projectId, 
          milestoneId: milestone.milestoneId 
        }
      };
      await docClient.send(new DeleteCommand(deleteParams));
      console.log(`  ✅ Deleted: ${milestone.milestoneName} (${milestone.milestoneId})`);
    }

    await autoUpdateProjectStatus(projectId);
    
    res.status(200).json({ 
      message: `Successfully deleted ${milestones.length} milestones`,
      deletedCount: milestones.length
    });
  } catch (error) {
    console.error('❌ Error deleting all milestones:', error);
    res.status(500).json({ message: 'Failed to delete milestones', error: error.message });
  }
};

// ✅ NEW: Trigger task status update when photo is confirmed
export const syncTaskStatusFromPhotos = async (req, res) => {
  const { projectId, taskId } = req.params;
  
  if (!projectId || !taskId) {
    return res.status(400).json({ message: 'projectId and taskId are required.' });
  }
  
  try {
    console.log(`🔄 Syncing task status from photos: ${taskId}`);
    
    // Get task details first
    const getParams = {
      TableName: tableName,
      Key: { projectId, milestoneId: taskId }
    };
    
    const result = await docClient.send(new GetCommand(getParams));
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const task = result.Item;
    
    // Calculate status from photos
    const autoStatus = await autoUpdateTaskStatus(projectId, taskId);
    
    if (!autoStatus) {
      return res.status(500).json({ message: 'Failed to calculate task status' });
    }
    
    console.log(`📊 Calculated status:`, autoStatus);
    
    // Update task with new status
    const updateParams = {
      TableName: tableName,
      Key: { projectId, milestoneId: taskId },
      UpdateExpression: 'SET #status = :status, completionPercentage = :percentage, updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': autoStatus.status,
        ':percentage': autoStatus.completionPercentage,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    
    // Add completedAt if task just completed
    if (autoStatus.status === 'completed' && task.status !== 'completed') {
      updateParams.UpdateExpression += ', completedAt = :completedAt';
      updateParams.ExpressionAttributeValues[':completedAt'] = new Date().toISOString();
    }
    
    const updateResult = await docClient.send(new UpdateCommand(updateParams));
    
    // Check if parent phase should auto-complete
    if (task.parentPhase) {
      const phaseCheck = await autoCheckPhaseCompletion(projectId, task.parentPhase);
      
      if (phaseCheck.shouldAutoComplete) {
        console.log(`✅ All tasks in phase ${task.parentPhase} are completed - Auto-completing phase!`);
        
        const phaseUpdateParams = {
          TableName: tableName,
          Key: { projectId, milestoneId: task.parentPhase },
          UpdateExpression: 'SET #status = :completed, completedAt = :now, updatedAt = :now',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':completed': 'completed',
            ':now': new Date().toISOString()
          },
          ReturnValues: 'ALL_NEW'
        };
        
        const phaseResult = await docClient.send(new UpdateCommand(phaseUpdateParams));
        sendCompletionEmail(projectId, phaseResult.Attributes.milestoneName, "phase");
      }
    }
    
    // Update project status
    await autoUpdateProjectStatus(projectId);
    
    // Send completion email if task just completed
    if (autoStatus.status === 'completed' && task.status !== 'completed') {
      sendCompletionEmail(projectId, task.milestoneName, "milestone");
    }
    
    res.status(200).json({
      message: 'Task status synced successfully',
      task: updateResult.Attributes,
      calculatedStatus: autoStatus
    });
    
  } catch (error) {
    console.error('❌ Error syncing task status:', error);
    res.status(500).json({ message: 'Failed to sync task status', error: error.message });
  }
};