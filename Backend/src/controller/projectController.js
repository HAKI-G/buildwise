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

// --- AWS DynamoDB Client Setup ---
// Make sure AWS credentials are configured with: aws configure
// and that the table exists in ap-southeast-1
const client = new DynamoDBClient({
  region: "ap-southeast-1",
});

const docClient = DynamoDBDocumentClient.from(client);

// IMPORTANT: DynamoDB table names are case-sensitive!
const tableName = "buildwiseProjects";

// --- Controller Functions ---

// GET /api/projects
export const getAllProjects = async (req, res) => {
  const params = { TableName: tableName };

  try {
    const data = await docClient.send(new ScanCommand(params));
    res.status(200).json(data.Items);
  } catch (error) {
    console.error("❌ Error fetching all projects:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch projects", error: error.message });
  }
};

// POST /api/projects
export const createProject = async (req, res) => {
  const { name, location, budget } = req.body;
  const projectId = uuidv4();

  const params = {
    TableName: tableName,
    Item: {
      projectId,
      name,
      location,
      budget,
      status: "Not Started",
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({
      message: "Project created successfully!",
      project: params.Item,
    });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res
      .status(500)
      .json({ message: "Failed to create project", error: error.message });
  }
};

// GET /api/projects/:id
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
    res
      .status(500)
      .json({ message: "Failed to fetch project", error: error.message });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const params = {
    TableName: tableName,
    Key: { projectId: id },
    UpdateExpression: "set #name = :n, #status = :s",
    ExpressionAttributeNames: {
      "#name": "name",
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":n": name,
      ":s": status,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const data = await docClient.send(new UpdateCommand(params));
    res.status(200).json({
      message: `Project ${id} updated successfully!`,
      updatedProject: data.Attributes,
    });
  } catch (error) {
    console.error(`❌ Error updating project with ID ${id}:`, error);
    res
      .status(500)
      .json({ message: "Failed to update project", error: error.message });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  const { id } = req.params;

  const params = {
    TableName: tableName,
    Key: { projectId: id },
  };

  try {
    await docClient.send(new DeleteCommand(params));
    res.status(200).json({ message: `Project ${id} deleted successfully.` });
  } catch (error) {
    console.error(`❌ Error deleting project with ID ${id}:`, error);
    res
      .status(500)
      .json({ message: "Failed to delete project", error: error.message });
  }
};
