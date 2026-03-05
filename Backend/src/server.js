// ✅ CRITICAL: This MUST be the absolute first thing
import dotenv from 'dotenv';
const result = dotenv.config();

// ✅ Check if .env loaded successfully
if (result.error) {
    console.error('❌ Failed to load .env file:', result.error);
    process.exit(1);
}

// ✅ DEBUG: Verify environment variables IMMEDIATELY
console.log('\n🔍 ========== ENVIRONMENT CHECK ==========');
console.log('.env file loaded from:', process.cwd() + '/.env');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT LOADED');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ LOADED (Length: ' + process.env.EMAIL_PASSWORD.length + ')' : '❌ NOT LOADED');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ LOADED' : '❌ NOT LOADED');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('==========================================\n');

// ✅ NOW import everything else AFTER dotenv is configured
import express from 'express';
import cors from 'cors';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Routes
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import milestoneRoutes from './routes/milestoneRoutes.js';
import progressUpdateRoutes from './routes/progressUpdateRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import settingsRoutes from './routes/settingsRoute.js';
import notificationRoutes from './routes/notificationRoute.js';
import supportTicketsRoutes from './routes/supportTicketsRoutes.js';
import forgotPasswordRoutes from './routes/forgotPasswordRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';

// ✅ Import cron job
import { startOverdueCronJob } from './utils/checkOverdueProjects.js';

// Middleware
import { protect, requireAdmin } from './middleware/authMiddleware.js';
import { checkMaintenanceMode } from './middleware/maintenanceMiddleware.js';
import reportRoutes from './routes/reportRoutes.js';
import aiAdvisorRoutes from './routes/aiAdvisorRoutes.js';

// Jobs
import { scheduleAuditLogCleanup } from './jobs/auditLogCleanup.js';

const app = express();
const port = process.env.PORT || 5001;

// DynamoDB setup for public maintenance check
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Middleware
app.use(cors({
  origin: [
    'http://buildwise-frontend.s3-website-ap-southeast-1.amazonaws.com',
    'http://buildwise-admin.s3-website-ap-southeast-1.amazonaws.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// 🔓 PUBLIC ROUTES (No authentication)
// ============================================

// Registration (must be before auth routes)
app.use('/api/registration', registrationRoutes);

// Forgot Password
app.use('/api/forgot-password', forgotPasswordRoutes);

// 2FA 
app.use('/api/2fa', twoFactorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'BuildWise API',
    emailConfigured: !!process.env.EMAIL_USER
  });
});

// Public maintenance status check (for frontend to check without auth)
app.get('/api/maintenance-status', async (req, res) => {
  try {
    const params = {
      TableName: "BuildWiseSettings",
      FilterExpression: "category = :category AND #key = :key",
      ExpressionAttributeNames: {
        '#key': 'key'
      },
      ExpressionAttributeValues: {
        ':category': 'system',
        ':key': 'maintenanceMode'
      }
    };

    const data = await docClient.send(new ScanCommand(params));
    const value = data.Items?.[0]?.value === true || data.Items?.[0]?.value === 'true';

    res.json({ value, maintenanceMode: value });
  } catch (error) {
    console.error('❌ Error fetching maintenance mode:', error);
    res.status(500).json({ error: error.message, value: false, maintenanceMode: false });
  }
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Support Tickets - PUBLIC route (anyone can submit tickets)
app.use('/api/support-tickets', supportTicketsRoutes);

// ============================================
// 🔒 PROTECTED ROUTES (With authentication)
// ============================================

// Admin routes (protected + admin only) - NO maintenance check
app.use('/api/admin', protect, requireAdmin, adminRoutes);
app.use('/api/admin/settings', protect, requireAdmin, settingsRoutes);
app.use('/api/admin/audit-logs', protect, requireAdmin, auditRoutes);

// Project routes (protected + maintenance check)
app.use('/api/projects', protect, checkMaintenanceMode, projectRoutes);

// Other protected routes (with maintenance check)
app.use('/api/users', protect, checkMaintenanceMode, userRoutes);
app.use('/api/milestones', protect, checkMaintenanceMode, milestoneRoutes);
app.use('/api/updates', protect, checkMaintenanceMode, progressUpdateRoutes);
app.use('/api/photos', protect, checkMaintenanceMode, photoRoutes);
app.use('/api/comments', protect, checkMaintenanceMode, commentRoutes);
app.use('/api/documents', protect, checkMaintenanceMode, documentRoutes);
app.use('/api/expenses', protect, checkMaintenanceMode, expenseRoutes);
app.use('/api/tasks', protect, checkMaintenanceMode, taskRoutes);
app.use('/api/notifications', protect, notificationRoutes);

// AI Advisor (protected)
app.use('/api/ai-advisor', protect, checkMaintenanceMode, aiAdvisorRoutes);

// Audit logs (protected)
app.use('/api/audit-logs', protect, auditRoutes);

// ============================================
// 🚀 START SERVER
// ============================================

// Start audit log cleanup job
scheduleAuditLogCleanup();
console.log('📅 Audit log cleanup scheduled');

// ✅ Start overdue checker cron job
startOverdueCronJob();
app.use('/api/reports', protect, checkMaintenanceMode, reportRoutes);

// ✅ Start server (ONLY ONE TIME)
app.listen(port, () => {
  console.log(`\n✅ BuildWise server started successfully!`);
  console.log(`🌐 Server running on: http://localhost:${port}`);
  console.log(`🔧 Health check: http://localhost:${port}/api/health`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  console.log(`✅ Overdue projects checker is active\n`);
});