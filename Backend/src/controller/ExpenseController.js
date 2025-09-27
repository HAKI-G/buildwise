import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'BuildWiseExpenses';

// @desc    Create a new expense for a project
// @route   POST /api/expenses/:projectId
export const createExpense = async (req, res) => {
  const { projectId } = req.params;
  const { description, amount, category, date } = req.body;
  const expenseId = uuidv4();

  if (!description || !amount) {
    return res.status(400).json({ message: "Description and amount are required." });
  }

  const params = {
    TableName: tableName,
    Item: {
      projectId, // Partition Key
      expenseId, // Sort Key
      description,
      amount: parseFloat(amount), // Ensure amount is a number
      category: category || 'General',
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json({ message: 'Expense created successfully!', expense: params.Item });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Failed to create expense", error: error.message });
  }
};

// @desc    Get all expenses for a specific project
// @route   GET /api/expenses/:projectId
export const getExpensesForProject = async (req, res) => {
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
    res.status(200).json(data.Items);
  } catch (error) {
    console.error(`Error fetching expenses for project ${projectId}:`, error);
    res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
};
