import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from './notificationController.js';

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

    // Send notification
    try {
      await sendNotification(
        'expense',
        'New Expense Logged',
        `${category || 'General'} expense of ₱${parseFloat(amount).toLocaleString()} added`,
        { projectId, expenseId, amount: parseFloat(amount), category }
      );
    } catch (notifErr) {
      console.warn('⚠️ Notification failed (non-blocking):', notifErr.message);
    }

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

// @desc    Update an expense (S19: allow price/material updates)
// @route   PUT /api/expenses/:projectId/:expenseId
export const updateExpense = async (req, res) => {
  const { projectId, expenseId } = req.params;
  const { description, amount, category, date } = req.body;

  if (!description && !amount && !category && !date) {
    return res.status(400).json({ message: "At least one field to update is required." });
  }

  try {
    // Build dynamic update expression
    let updateParts = [];
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};

    if (description !== undefined) {
      updateParts.push('#desc = :desc');
      expressionAttributeNames['#desc'] = 'description';
      expressionAttributeValues[':desc'] = description;
    }
    if (amount !== undefined) {
      updateParts.push('amount = :amount');
      expressionAttributeValues[':amount'] = parseFloat(amount);
    }
    if (category !== undefined) {
      updateParts.push('category = :category');
      expressionAttributeValues[':category'] = category;
    }
    if (date !== undefined) {
      updateParts.push('#dt = :dt');
      expressionAttributeNames['#dt'] = 'date';
      expressionAttributeValues[':dt'] = date;
    }

    updateParts.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: tableName,
      Key: { projectId, expenseId },
      UpdateExpression: 'SET ' + updateParts.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));
    res.status(200).json({ message: 'Expense updated successfully!', expense: result.Attributes });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Failed to update expense", error: error.message });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:projectId/:expenseId
export const deleteExpense = async (req, res) => {
  const { projectId, expenseId } = req.params;

  try {
    const params = {
      TableName: tableName,
      Key: { projectId, expenseId }
    };

    await docClient.send(new DeleteCommand(params));
    res.status(200).json({ message: 'Expense deleted successfully!' });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Failed to delete expense", error: error.message });
  }
};
