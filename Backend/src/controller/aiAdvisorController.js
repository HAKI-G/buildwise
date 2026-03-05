import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getConstructionAdvice, analyzeProjectRisks, generateChatTitle } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CHAT_SESSIONS_TABLE = 'BuildWiseAIChatSessions';

/**
 * AI Construction Advisor Controller
 * Provides intelligent project advice, risk analysis, and persistent chat sessions
 */

// ============================================
// POST /api/ai-advisor/chat
// Ask the AI Advisor a question (with session persistence)
// ============================================
export const askAdvisor = async (req, res) => {
  const { question, projectId, sessionId } = req.body;
  const userId = req.user?.id || req.user?.userId || 'anonymous';

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ message: 'Question is required' });
  }

  try {
    let projectData = {};
    let session = null;
    let currentSessionId = sessionId;

    console.log(`🤖 AI Chat | User: ${req.user?.name || req.user?.email || userId} | Project: ${projectId || 'General'} | Session: ${sessionId ? 'Existing' : 'New'}`);
    console.log(`   Question: ${question.trim().substring(0, 100)}${question.length > 100 ? '...' : ''}`);

    // If projectId is provided, gather project context
    if (projectId) {
      projectData = await gatherProjectData(projectId);
    }

    // Load existing session or create new one
    if (currentSessionId) {
      session = await loadSession(userId, currentSessionId);
    }

    if (!session) {
      // Create a new session
      currentSessionId = uuidv4();
      session = {
        userId,
        sessionId: currentSessionId,
        projectId: projectId || null,
        title: question.trim().substring(0, 80),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Build conversation history from session messages (exclude error messages)
    const conversationHistory = session.messages.filter(m => !m.error);

    // Call AI with conversation history for multi-turn context
    const result = await getConstructionAdvice(question, projectData, conversationHistory);

    // Add user message and AI response to session
    const userMsg = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() };
    const aiMsg = {
      role: 'assistant',
      content: result.response,
      timestamp: result.timestamp || new Date().toISOString(),
      error: !result.success
    };

    // Generate smart AI title for NEW sessions (first message only)
    const isFirstMessage = session.messages.length === 0;

    session.messages.push(userMsg, aiMsg);
    session.updatedAt = new Date().toISOString();
    if (projectId && !session.projectId) {
      session.projectId = projectId;
    }

    // If this is the first message, generate a smart title asynchronously
    if (isFirstMessage) {
      try {
        const smartTitle = await generateChatTitle(question, result.response);
        if (smartTitle) {
          session.title = smartTitle;
          console.log(`📝 AI Title generated: "${smartTitle}"`);
        }
      } catch (titleErr) {
        console.warn('⚠️ Title generation failed, keeping default:', titleErr.message);
        // Keep the truncated question as fallback — already set during session creation
      }
    }

    // Save session to DynamoDB
    await saveSession(session);

    console.log(`✅ AI Response sent | Session: ${currentSessionId.substring(0, 8)}... | Messages in session: ${session.messages.length}`);

    res.status(200).json({
      success: result.success,
      response: result.response,
      sessionId: currentSessionId,
      projectId: projectId || null,
      title: session.title,
      timestamp: result.timestamp,
      model: result.model
    });
  } catch (error) {
    console.error('❌ AI Advisor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI advice',
      error: error.message
    });
  }
};

// ============================================
// POST /api/ai-advisor/risk-analysis/:projectId
// Get AI risk analysis for a specific project
// ============================================
export const getProjectRiskAnalysis = async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const projectData = await gatherProjectData(projectId);

    if (!projectData.project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const analysis = await analyzeProjectRisks(projectData);

    res.status(200).json({
      success: analysis.success,
      projectId,
      projectName: projectData.project?.name || 'Unknown',
      ...analysis
    });
  } catch (error) {
    console.error('❌ Risk analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze project risks',
      error: error.message
    });
  }
};

// ============================================
// GET /api/ai-advisor/quick-insights/:projectId
// Get quick AI insights for dashboard display
// ============================================
export const getQuickInsights = async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const projectData = await gatherProjectData(projectId);

    if (!projectData.project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Build quick insights from actual data
    const insights = [];
    
    // Progress insight
    if (projectData.progress !== undefined) {
      if (projectData.progress >= 90) {
        insights.push({
          type: 'success',
          icon: 'check-circle',
          message: `Project is ${projectData.progress}% complete — nearing completion!`
        });
      } else if (projectData.progress < 30) {
        insights.push({
          type: 'info',
          icon: 'info',
          message: `Project is still in early stages at ${projectData.progress}% completion.`
        });
      }
    }

    // Budget insight
    if (projectData.totalSpent !== undefined && projectData.project?.contractCost) {
      const budgetPct = (projectData.totalSpent / projectData.project.contractCost) * 100;
      const progressPct = projectData.progress || 0;
      
      if (budgetPct > progressPct + 15) {
        insights.push({
          type: 'warning',
          icon: 'alert-triangle',
          message: `Budget usage (${budgetPct.toFixed(0)}%) is ahead of progress (${progressPct}%). Consider reviewing expenses.`
        });
      } else if (budgetPct > 90) {
        insights.push({
          type: 'danger',
          icon: 'alert-circle',
          message: `${budgetPct.toFixed(0)}% of budget has been used. Remaining: ₱${(projectData.project.contractCost - projectData.totalSpent).toLocaleString()}`
        });
      }
    }

    // Tasks insight
    if (projectData.tasks && projectData.tasks.length > 0) {
      const overdue = projectData.tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && (t.completionPercentage || 0) < 100;
      });
      
      if (overdue.length > 0) {
        insights.push({
          type: 'warning',
          icon: 'clock',
          message: `${overdue.length} task(s) are past their due date and still incomplete.`
        });
      }

      const incomplete = projectData.tasks.filter(t => (t.completionPercentage || 0) < 100);
      if (incomplete.length > 0) {
        insights.push({
          type: 'info',
          icon: 'list',
          message: `${incomplete.length} of ${projectData.tasks.length} tasks remaining to complete.`
        });
      }
    }

    // Photos insight
    if (projectData.pendingPhotos > 0) {
      insights.push({
        type: 'info',
        icon: 'camera',
        message: `${projectData.pendingPhotos} photo(s) awaiting AI analysis confirmation.`
      });
    }

    res.status(200).json({
      success: true,
      projectId,
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Quick insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message
    });
  }
};


// ============================================
// GET /api/ai-advisor/sessions
// Get all chat sessions for the current user
// ============================================
export const getUserSessions = async (req, res) => {
  const userId = req.user?.id || req.user?.userId || 'anonymous';

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: CHAT_SESSIONS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false // newest first
    }));

    // Return sessions without full message arrays (just metadata)
    const sessions = (result.Items || []).map(s => ({
      sessionId: s.sessionId,
      title: s.title,
      projectId: s.projectId,
      messageCount: s.messages?.length || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    // Sort by updatedAt descending
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: error.message });
  }
};

// ============================================
// GET /api/ai-advisor/sessions/:sessionId
// Get a specific chat session with all messages
// ============================================
export const getSession = async (req, res) => {
  const userId = req.user?.id || req.user?.userId || 'anonymous';
  const { sessionId } = req.params;

  try {
    const session = await loadSession(userId, sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session', error: error.message });
  }
};

// ============================================
// DELETE /api/ai-advisor/sessions/:sessionId
// Delete a chat session
// ============================================
export const deleteSession = async (req, res) => {
  const userId = req.user?.id || req.user?.userId || 'anonymous';
  const { sessionId } = req.params;

  try {
    await docClient.send(new DeleteCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Key: { userId, sessionId }
    }));

    res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete session', error: error.message });
  }
};


// ============================================
// HELPERS: Session persistence (DynamoDB)
// ============================================
async function loadSession(userId, sessionId) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Key: { userId, sessionId }
    }));
    return result.Item || null;
  } catch (err) {
    console.error('⚠️ Error loading session:', err.message);
    return null;
  }
}

async function saveSession(session) {
  try {
    await docClient.send(new PutCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Item: session
    }));
  } catch (err) {
    console.error('⚠️ Error saving session:', err.message);
    throw err;
  }
}


// ============================================
// HELPER: Gather all project data for AI context
// ============================================
async function gatherProjectData(projectId) {
  const data = {};

  try {
    // 1. Get project details
    const projectScan = await docClient.send(new ScanCommand({
      TableName: 'buildwiseProjects',
      FilterExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId }
    }));
    data.project = projectScan.Items?.[0] || null;

    // 2. Get milestones/tasks
    const milestonesResult = await docClient.send(new QueryCommand({
      TableName: 'BuildWiseMilestones',
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId }
    }));
    const allMilestones = milestonesResult.Items || [];
    data.phases = allMilestones.filter(m => m.type === 'phase' || !m.parentPhase);
    data.tasks = allMilestones.filter(m => m.type === 'task' || m.parentPhase);

    // 3. Calculate overall progress
    if (data.phases.length > 0) {
      const totalProgress = data.phases.reduce((sum, p) => sum + (p.completionPercentage || 0), 0);
      data.progress = Math.round(totalProgress / data.phases.length);
    }

    // 4. Get expenses
    const expenseScan = await docClient.send(new ScanCommand({
      TableName: 'BuildWiseExpenses',
      FilterExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId }
    }));
    data.expenses = expenseScan.Items || [];
    data.totalSpent = data.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // 5. Get photos (recent + pending count)
    const photoScan = await docClient.send(new ScanCommand({
      TableName: 'BuildWisePhotos',
      FilterExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId }
    }));
    const photos = photoScan.Items || [];
    data.recentPhotos = photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5);
    data.pendingPhotos = photos.filter(p => p.confirmationStatus === 'pending').length;

  } catch (err) {
    console.error('⚠️ Error gathering project data:', err.message);
  }

  return data;
}
