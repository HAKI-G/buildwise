import express from 'express';
import { askAdvisor, getProjectRiskAnalysis, getQuickInsights, getUserSessions, getSession, deleteSession } from '../controller/aiAdvisorController.js';

const router = express.Router();

// POST /api/ai-advisor/chat - Ask AI a question (with session persistence)
router.post('/chat', askAdvisor);

// GET /api/ai-advisor/sessions - Get all user's chat sessions
router.get('/sessions', getUserSessions);

// GET /api/ai-advisor/sessions/:sessionId - Get a specific session with messages
router.get('/sessions/:sessionId', getSession);

// DELETE /api/ai-advisor/sessions/:sessionId - Delete a session
router.delete('/sessions/:sessionId', deleteSession);

// POST /api/ai-advisor/risk-analysis/:projectId - Get risk analysis
router.post('/risk-analysis/:projectId', getProjectRiskAnalysis);

// GET /api/ai-advisor/quick-insights/:projectId - Get quick dashboard insights
router.get('/quick-insights/:projectId', getQuickInsights);

export default router;
