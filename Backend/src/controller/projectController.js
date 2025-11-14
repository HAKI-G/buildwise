import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { logAudit } from "./auditController.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3Upload.js";

const client = new DynamoDBClient({
  region: "ap-southeast-1",
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = "buildwiseProjects";

// ==================== STATUS MANAGEMENT FUNCTIONS ====================

// ✅ Calculate project status automatically
export const calculateProjectStatus = async (projectId) => {
    try {
        const projectParams = {
            TableName: tableName,
            Key: { projectId }
        };
        const projectResult = await docClient.send(new GetCommand(projectParams));
        const project = projectResult.Item;
        
        if (!project) return null;
        
        // Get milestones/tasks
        const milestonesParams = {
            TableName: 'BuildWiseMilestones',
            KeyConditionExpression: 'projectId = :projectId',
            ExpressionAttributeValues: {
                ':projectId': projectId
            }
        };
        const milestonesResult = await docClient.send(new QueryCommand(milestonesParams));
        const milestones = milestonesResult.Items || [];
        
        const tasks = milestones.filter(m => m.isPhase !== true);
        const phases = milestones.filter(m => m.isPhase === true);
        
        // Get photos
        let photos = [];
        try {
            const photosParams = {
                TableName: 'BuildWisePhotos',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: {
                    ':projectId': projectId
                }
            };
            const photosResult = await docClient.send(new ScanCommand(photosParams));
            photos = photosResult.Items || [];
        } catch (error) {
            console.warn('Could not fetch photos:', error.message);
        }
        
        let calculatedStatus = project.status || 'Not Started';
        
        // Don't override manual statuses
        if (project.status === 'On Hold' || project.status === 'Completed') {
            return project.status;
        }
        
        // 1. NOT STARTED: No tasks, no phases, no photos
        if (tasks.length === 0 && phases.length === 0 && photos.length === 0) {
            calculatedStatus = 'Not Started';
        }
        // 2. IN PROGRESS: Has tasks/phases/photos
        else if (tasks.length > 0 || phases.length > 0 || photos.length > 0) {
            const allTasksComplete = tasks.length > 0 && tasks.every(t => (t.completionPercentage || 0) >= 100);
            calculatedStatus = allTasksComplete ? 'In Progress' : 'In Progress';
        }
        
        // 3. OVERDUE: Past due date
        if (project.contractCompletionDate || project.targetDate) {
            const dueDate = new Date(project.contractCompletionDate || project.targetDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (today > dueDate && calculatedStatus !== 'Completed' && project.status !== 'On Hold') {
                calculatedStatus = 'Overdue';
            }
        }
        
        return calculatedStatus;
        
    } catch (error) {
        console.error('Error calculating project status:', error);
        return null;
    }
};

// ✅ Auto-update project status
export const autoUpdateProjectStatus = async (projectId) => {
    try {
        const newStatus = await calculateProjectStatus(projectId);
        
        if (!newStatus) return;
        
        const params = {
            TableName: tableName,
            Key: { projectId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': newStatus
            }
        };
        
        await docClient.send(new UpdateCommand(params));
        
        console.log(`✅ Project ${projectId} status auto-updated to: ${newStatus}`);
        
    } catch (error) {
        console.error('Error auto-updating project status:', error);
    }
};

// ✅ Manual update project status endpoint
export const updateProjectStatus = async (req, res) => {
    const { projectId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Not Started', 'In Progress', 'On Hold', 'Overdue', 'Completed'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            message: 'Invalid status',
            validStatuses 
        });
    }
    
    try {
        const params = {
            TableName: tableName,
            Key: { projectId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status
            },
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await docClient.send(new UpdateCommand(params));
        
        // Create audit log
        await logAudit({
            userId: req.user.id,
            action: 'PROJECT_STATUS_UPDATED',
            actionDescription: `Project status changed to: ${status}`,
            targetType: 'project',
            targetId: projectId,
            changes: { status }
        });
        
        console.log(`✅ Project status manually updated to: ${status}`);
        
        res.status(200).json({
            message: 'Project status updated successfully',
            project: result.Attributes
        });
        
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ message: 'Failed to update project status', error: error.message });
    }
};

// ==================== EXISTING CRUD FUNCTIONS ====================

/**
 * @desc     Get all projects
 * @route    GET /api/projects
 */
export const getAllProjects = async (req, res) => {
  const params = { TableName: tableName };
  try {
    const data = await docClient.send(new ScanCommand(params));
    res.status(200).json(data.Items);
  } catch (error) {
    console.error("❌ Error fetching all projects:", error);
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
};

/**
 * @desc     Create a new project
 * @route    POST /api/projects
 */
export const createProject = async (req, res) => {
  console.log("📦 Incoming request body:", req.body); 
  const { 
    name, 
    location, 
    contractor, 
    dateStarted, 
    contractCompletionDate, 
    contractCost,
    constructionConsultant,
    implementingOffice,
    sourcesOfFund,
    projectManager
  } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ message: "Please provide at least a project name and location." });
  }

  try {
    const userId = req.user.id;
    
    // Check project limit
    const settingsParams = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: { '#key': 'key' },
      ExpressionAttributeValues: { ':category': 'system', ':key': 'maxProjectsPerUser' }
    };
    const settingsData = await docClient.send(new ScanCommand(settingsParams));
    const maxProjects = settingsData.Items?.[0]?.value || 50;

    const countParams = {
      TableName: tableName,
      FilterExpression: "createdBy = :userId",
      ExpressionAttributeValues: { ':userId': userId }
    };
    const projectsData = await docClient.send(new ScanCommand(countParams));
    const currentCount = projectsData.Items?.length || 0;

    if (currentCount >= maxProjects) {
      return res.status(403).json({
        error: `You have reached the maximum limit of ${maxProjects} projects.`
      });
    }

    // Handle image upload to S3
    let projectImageUrl = null;
    if (req.file) {
      try {
        projectImageUrl = await uploadToS3(req.file, "projects");
        console.log("✅ Project image uploaded to S3:", projectImageUrl);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError);
        return res.status(500).json({ 
          message: "Failed to upload project image", 
          error: uploadError.message 
        });
      }
    }

    const projectId = uuidv4();
    
    const projectItem = {
      projectId,
      name,
      location,
      contractor,
      dateStarted,
      contractCompletionDate,
      contractCost,
      constructionConsultant,
      implementingOffice,
      sourcesOfFund,
      projectManager: projectManager && projectManager.trim() !== "" 
        ? projectManager.trim() 
        : "Juan Dela Cruz",
      projectImage: projectImageUrl,
      status: "Not Started",
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    const putParams = {
      TableName: tableName,
      Item: projectItem,
    };

    await docClient.send(new PutCommand(putParams));

    // Create audit log
    await logAudit({
      userId: userId,
      action: 'PROJECT_CREATED',
      actionDescription: `New project created: ${name}`,
      targetType: 'project',
      targetId: projectId,
      changes: { name, location, contractor, hasImage: !!projectImageUrl }
    });

    res.status(201).json({
      message: "Project created successfully!",
      project: projectItem,
    });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
};

/**
 * @desc     Get a single project by its ID
 * @route    GET /api/projects/:id
 */
export const getProjectById = async (req, res) => {
  const { id } = req.params;
  const params = {
    TableName: tableName,
    Key: { projectId: id },
  };
  try {
    const data = await docClient.send(new GetCommand(params));
    if (data.Item) {
      res.status(200).json(data.Item);
    } else {
      res.status(404).json({ message: "Project not found" });
    }
  } catch (error) {
    console.error(`❌ Error fetching project with ID ${id}:`, error);
    res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
};

/**
 * @desc     Update an existing project
 * @route    PUT /api/projects/:id
 */
export const updateProject = async (req, res) => {
  console.log("📦 Incoming request body:", req.body); 
  const { id } = req.params;
  const {
    name,
    location,
    contractor,
    dateStarted,
    contractCompletionDate,
    contractCost,
    constructionConsultant,
    implementingOffice,
    sourcesOfFund,
    projectManager,
    status
  } = req.body;

  let updateExp = "set";
  const expAttrNames = {};
  const expAttrValues = {};

  const addUpdateField = (field, value) => {
    if (value !== undefined) {
      const placeholder = `#${field}`;
      const valuePlaceholder = `:${field}`;
      if (updateExp !== "set") updateExp += ",";
      updateExp += ` ${placeholder} = ${valuePlaceholder}`;
      expAttrNames[placeholder] = field;
      expAttrValues[valuePlaceholder] = value;
    }
  };

  addUpdateField("name", name);
  addUpdateField("location", location);
  addUpdateField("contractor", contractor);
  addUpdateField("dateStarted", dateStarted);
  addUpdateField("contractCompletionDate", contractCompletionDate);
  addUpdateField("contractCost", contractCost);
  addUpdateField("constructionConsultant", constructionConsultant);
  addUpdateField("implementingOffice", implementingOffice);
  addUpdateField("sourcesOfFund", sourcesOfFund);

  if (projectManager && projectManager.trim() !== "") {
    addUpdateField("projectManager", projectManager.trim());
  }

  addUpdateField("status", status);

  // Handle image update if new file is uploaded
  if (req.file) {
    try {
      const getParams = {
        TableName: tableName,
        Key: { projectId: id },
      };
      const existingProject = await docClient.send(new GetCommand(getParams));
      
      if (existingProject.Item?.projectImage) {
        await deleteFromS3(existingProject.Item.projectImage);
      }

      const newImageUrl = await uploadToS3(req.file, "projects");
      addUpdateField("projectImage", newImageUrl);
      console.log("✅ Project image updated:", newImageUrl);
    } catch (uploadError) {
      console.error("❌ Image update failed:", uploadError);
      return res.status(500).json({ 
        message: "Failed to update project image", 
        error: uploadError.message 
      });
    }
  }

  const params = {
    TableName: tableName,
    Key: { projectId: id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: expAttrNames,
    ExpressionAttributeValues: expAttrValues,
    ReturnValues: "ALL_NEW",
  };

  try {
    const data = await docClient.send(new UpdateCommand(params));

    // Create audit log
    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_UPDATED',
      actionDescription: `Project updated: ${name || id}`,
      targetType: 'project',
      targetId: id,
      changes: { name, location, contractor, status }
    });

    res.status(200).json({
      message: `Project ${id} updated successfully!`,
      updatedProject: data.Attributes,
    });
  } catch (error) {
    console.error(`❌ Error updating project with ID ${id}:`, error);
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
};

/**
 * @desc     Partially update a project (for quick updates like status)
 * @route    PATCH /api/projects/:id
 */
export const patchProject = async (req, res) => {
  console.log("📦 PATCH request body:", req.body);
  const { id } = req.params;
  const updateData = req.body;

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ 
      message: "Please provide at least one field to update" 
    });
  }

  try {
    const getParams = {
      TableName: tableName,
      Key: { projectId: id },
    };
    const existingProject = await docClient.send(new GetCommand(getParams));
    
    if (!existingProject.Item) {
      return res.status(404).json({ message: "Project not found" });
    }

    let updateExp = "set";
    const expAttrNames = {};
    const expAttrValues = {};
    
    Object.keys(updateData).forEach((field, index) => {
      const placeholder = `#field${index}`;
      const valuePlaceholder = `:val${index}`;
      
      if (updateExp !== "set") {
        updateExp += ",";
      }
      
      updateExp += ` ${placeholder} = ${valuePlaceholder}`;
      expAttrNames[placeholder] = field;
      expAttrValues[valuePlaceholder] = updateData[field];
    });

    const updateParams = {
      TableName: tableName,
      Key: { projectId: id },
      UpdateExpression: updateExp,
      ExpressionAttributeNames: expAttrNames,
      ExpressionAttributeValues: expAttrValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await docClient.send(new UpdateCommand(updateParams));

    const actionDescription = updateData.status 
      ? `Project status changed to: ${updateData.status}`
      : `Project fields updated: ${Object.keys(updateData).join(', ')}`;

    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_UPDATED',
      actionDescription: actionDescription,
      targetType: 'project',
      targetId: id,
      changes: updateData
    });

    console.log(`✅ Project ${id} patched successfully`);
    res.status(200).json({
      success: true,
      message: `Project updated successfully`,
      project: result.Attributes,
    });

  } catch (error) {
    console.error(`❌ Error patching project with ID ${id}:`, error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update project", 
      error: error.message 
    });
  }
};

/**
 * @desc     Delete a project
 * @route    DELETE /api/projects/:id
 */
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const getParams = {
      TableName: tableName,
      Key: { projectId: id },
    };
    const projectData = await docClient.send(new GetCommand(getParams));
    const project = projectData.Item;

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.projectImage) {
      try {
        await deleteFromS3(project.projectImage);
        console.log("✅ Project image deleted from S3");
      } catch (s3Error) {
        console.warn("⚠️ Could not delete image from S3:", s3Error.message);
      }
    }

    const deleteParams = {
      TableName: tableName,
      Key: { projectId: id },
    };
    await docClient.send(new DeleteCommand(deleteParams));

    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_DELETED',
      actionDescription: `Project deleted: ${project.name}`,
      targetType: 'project',
      targetId: id
    });

    res.status(200).json({ message: `Project ${id} deleted successfully.` });
  } catch (error) {
    console.error(`❌ Error deleting project with ID ${id}:`, error);
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
};