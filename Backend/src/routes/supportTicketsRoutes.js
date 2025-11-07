// supportTicketsRoutes.js
import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import nodemailer from 'nodemailer';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Initialize DynamoDB Client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const SUPPORT_TICKETS_TABLE = 'BuildWiseSupportTickets';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send email notification to admin
async function sendAdminNotification(ticketData) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'buildwisecapstone@gmail.com',
    subject: `🎫 New Support Ticket: ${ticketData.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Support Ticket Received</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ticket Number:</strong> ${ticketData.ticketNumber}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending</span></p>
          <p><strong>Priority:</strong> ${ticketData.priority}</p>
          <p><strong>Submitted:</strong> ${new Date(ticketData.timestamp).toLocaleString()}</p>
        </div>
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${ticketData.name}</p>
        <p><strong>Email:</strong> ${ticketData.email}</p>
        <p><strong>Account ID:</strong> ${ticketData.accountId}</p>
        <h3>Issue Details</h3>
        <p><strong>Subject:</strong> ${ticketData.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #fff; padding: 15px; border-left: 4px solid #2563eb; margin: 10px 0;">
          ${ticketData.message}
        </div>
        <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
          This is an automated notification from BuildWise Support System.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
  }
}

// Send confirmation email to user
async function sendUserConfirmation(ticketData) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: ticketData.email,
    subject: `✅ Support Ticket Received - ${ticketData.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank You for Contacting BuildWise Support</h2>
        <p>Hi ${ticketData.name},</p>
        <p>We've received your support ticket and our team will review it shortly.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Ticket Number:</strong></p>
          <p style="font-size: 24px; font-family: monospace; color: #2563eb; font-weight: bold;">
            ${ticketData.ticketNumber}
          </p>
          <p style="color: #6b7280; font-size: 14px;">Please save this number for your reference.</p>
        </div>
        <h3>Ticket Summary</h3>
        <p><strong>Subject:</strong> ${ticketData.subject}</p>
        <p><strong>Submitted:</strong> ${new Date(ticketData.timestamp).toLocaleString()}</p>
        <p style="margin-top: 30px;">
          We typically respond within 24-48 hours. You'll receive an email update once we've reviewed your ticket.
        </p>
        <p>Best regards,<br><strong>BuildWise Support Team</strong></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          If you have any questions, reply to this email or contact us at +639649116425.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ User confirmation sent successfully');
  } catch (error) {
    console.error('❌ Error sending user confirmation:', error);
  }
}

// POST - Create new support ticket (PUBLIC - no auth required)
router.post('/', async (req, res) => {
  try {
    const { ticketNumber, name, email, accountId, subject, message, timestamp, status, priority } = req.body;

    // Validate required fields
    if (!ticketNumber || !name || !email || !accountId || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    const ticketData = {
      ticketNumber,
      name,
      email,
      accountId,
      subject,
      message,
      timestamp: timestamp || new Date().toISOString(),
      status: status || 'pending',
      priority: priority || 'normal',
      resolvedAt: null,
      resolvedBy: null,
      adminNotes: ''
    };

    // Save to DynamoDB
    const command = new PutCommand({
      TableName: SUPPORT_TICKETS_TABLE,
      Item: ticketData,
    });

    await docClient.send(command);

    // Send email notifications (don't wait for them)
    sendAdminNotification(ticketData).catch(err => console.error('Email error:', err));
    sendUserConfirmation(ticketData).catch(err => console.error('Email error:', err));

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticketData,
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message,
    });
  }
});

// GET - Get all support tickets (ADMIN only - requires auth)
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;

    const params = {
      TableName: SUPPORT_TICKETS_TABLE,
    };

    // Add filter if status is specified
    if (status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues = { ':status': status };
    }

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    // Sort by timestamp (newest first)
    const tickets = result.Items.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: error.message,
    });
  }
});

// GET - Get single ticket by ticketNumber (ADMIN only)
router.get('/:ticketNumber', protect, async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    const command = new GetCommand({
      TableName: SUPPORT_TICKETS_TABLE,
      Key: { ticketNumber },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    res.json({
      success: true,
      data: result.Item,
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket',
      error: error.message,
    });
  }
});

// PATCH - Update ticket status (ADMIN only)
router.patch('/:ticketNumber', protect, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { status, priority, adminNotes } = req.body;
    
    const adminUser = req.user?.username || 'admin';

    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;

      if (status === 'resolved' || status === 'closed') {
        updateExpression.push('resolvedAt = :resolvedAt');
        updateExpression.push('resolvedBy = :resolvedBy');
        expressionAttributeValues[':resolvedAt'] = new Date().toISOString();
        expressionAttributeValues[':resolvedBy'] = adminUser;
      }
    }

    if (priority) {
      updateExpression.push('priority = :priority');
      expressionAttributeValues[':priority'] = priority;
    }

    if (adminNotes !== undefined) {
      updateExpression.push('adminNotes = :adminNotes');
      expressionAttributeValues[':adminNotes'] = adminNotes;
    }

    const command = new UpdateCommand({
      TableName: SUPPORT_TICKETS_TABLE,
      Key: { ticketNumber },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      data: result.Attributes,
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support ticket',
      error: error.message,
    });
  }
});

// DELETE - Delete ticket (ADMIN only)
router.delete('/:ticketNumber', protect, async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    const command = new DeleteCommand({
      TableName: SUPPORT_TICKETS_TABLE,
      Key: { ticketNumber },
    });

    await docClient.send(command);

    res.json({
      success: true,
      message: 'Support ticket deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete support ticket',
      error: error.message,
    });
  }
});

export default router;