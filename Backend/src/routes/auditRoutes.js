//auditRoute.js
import express from "express";
import {
  createAuditLog,
  getAuditLogs,
  getAuditLogsByUser,
  archiveLog,
  unarchiveLog,
  bulkArchiveLogs
} from "../controller/auditController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ POST - Users can CREATE logs (only need to be logged in)
router.post("/", protect, createAuditLog);

// ✅ GET - Only admins can VIEW logs
router.get("/", protect, requireAdmin, getAuditLogs);
router.get("/user/:userId", protect, requireAdmin, getAuditLogsByUser);

// ✅ ARCHIVE routes (admin only) - Changed to POST to send body data
router.post("/archive", protect, requireAdmin, archiveLog);
router.post("/unarchive", protect, requireAdmin, unarchiveLog);
router.post("/bulk-archive", protect, requireAdmin, bulkArchiveLogs);

export default router;































