import express from 'express';
   import { protect, requireAdmin } from '../middleware/authMiddleware.js';
   import {
     getAllUsersAdmin,
     getUserByIdAdmin,
     createUserAdmin,
     updateUserAdmin,
     deleteUserAdmin
   } from '../controller/adminController.js';
   import { 
     getAuditLogs,
     getAuditLogsByUser,
     archiveLog,
     unarchiveLog,
     bulkArchiveLogs
   } from '../controller/auditController.js';

   // ✅ ADD THIS IMPORT
   import adminDashboardRoutes from './adminDashboardRoutes.js';

   const router = express.Router();

   router.use(protect);

   // User management routes
   router.get('/users', getAllUsersAdmin);
   router.get('/users/:userId', getUserByIdAdmin);
   router.post('/users', createUserAdmin);
   router.put('/users/:userId', updateUserAdmin);
   router.delete('/users/:userId', deleteUserAdmin);

   // Audit log routes
   router.get('/audit-logs', getAuditLogs);
   router.get('/audit-logs/user/:userId', getAuditLogsByUser);
   router.post('/audit-logs/archive', archiveLog);
   router.post('/audit-logs/unarchive', unarchiveLog);
   router.post('/audit-logs/bulk-archive', bulkArchiveLogs);

   // ✅ ADD THIS - Admin Dashboard routes
   router.use('/dashboard', adminDashboardRoutes);

   export default router;
