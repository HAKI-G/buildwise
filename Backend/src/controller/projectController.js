import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { logAudit } from "./auditController.js"; // ✅ Import audit logger

const client = new DynamoDBClient({
  region: "ap-southeast-1",
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = "buildwiseProjects";

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

    // Max Projects Per User Enforcement
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
      status: "Not Started",
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    const putParams = {
      TableName: tableName,
      Item: projectItem,
    };

    await docClient.send(new PutCommand(putParams));

    // ✅ Create audit log
    await logAudit({
      userId: userId,
      action: 'PROJECT_CREATED',
      actionDescription: `New project created: ${name}`,
      targetType: 'project',
      targetId: projectId,
      changes: { name, location, contractor }
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

    // ✅ Create audit log
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
 * @desc     Delete a project
 * @route    DELETE /api/projects/:id
 */
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    // Get project details first for audit log
    const getParams = {
      TableName: tableName,
      Key: { projectId: id },
    };
    const projectData = await docClient.send(new GetCommand(getParams));
    const project = projectData.Item;

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete project
    const deleteParams = {
      TableName: tableName,
      Key: { projectId: id },
    };
    await docClient.send(new DeleteCommand(deleteParams));

    // ✅ Create audit log
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