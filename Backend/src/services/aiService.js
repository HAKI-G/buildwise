import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

/**
 * AI Service for BuildWise
 * Uses Claude Vision for construction photo analysis
 * and Claude for intelligent project advisory
 */

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// ============================================
// 1. CONSTRUCTION PHOTO ANALYSIS (Claude Vision)
// ============================================

/**
 * Analyze a construction photo using Claude Vision AI
 * Returns: progress estimate, safety observations, material detection, recommendations
 */
export const analyzeConstructionPhoto = async (imageUrl, taskName, phaseName, projectContext = {}) => {
  const client = getClient();

  // Download image and convert to base64
  let imageBase64, mediaType;
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    
    // Determine media type from URL or default to jpeg
    if (imageUrl.includes('.png')) mediaType = 'image/png';
    else if (imageUrl.includes('.webp')) mediaType = 'image/webp';
    else if (imageUrl.includes('.gif')) mediaType = 'image/gif';
    else mediaType = 'image/jpeg';
  } catch (err) {
    console.error('❌ Failed to download image for AI analysis:', err.message);
    return {
      success: false,
      error: 'Failed to download image',
      message: err.message
    };
  }

  const systemPrompt = `You are an expert construction site analyst for BuildWise, a real-time progress monitoring platform for New San Jose Builders Inc., a construction company in the Philippines. 

You analyze construction photos to help project managers track progress accurately. Your analysis must be practical, specific, and actionable.

IMPORTANT: Always respond in valid JSON format only. No markdown, no code blocks, just pure JSON.`;

  const userPrompt = `Analyze this construction site photo.

CONTEXT:
- Task/Activity: ${taskName || 'General construction'}
- Phase: ${phaseName || 'Unknown phase'}
${projectContext.projectName ? `- Project: ${projectContext.projectName}` : ''}
${projectContext.location ? `- Location: ${projectContext.location}` : ''}

Provide your analysis as JSON with this exact structure:
{
  "success": true,
  "progress_assessment": {
    "estimated_completion_percentage": <number 0-100>,
    "confidence": "<high|medium|low>",
    "stage": "<brief stage description, e.g. 'Foundation laying - rebar installation'>"
  },
  "construction_details": {
    "visible_work": ["<list of visible construction activities>"],
    "materials_detected": ["<list of construction materials visible>"],
    "equipment_detected": ["<list of equipment/machinery visible>"],
    "structural_elements": ["<list of structural elements visible>"]
  },
  "safety_assessment": {
    "overall_rating": "<safe|caution|concern>",
    "observations": ["<safety observations>"],
    "recommendations": ["<safety recommendations if any>"]
  },
  "quality_observations": {
    "positive": ["<good quality indicators>"],
    "concerns": ["<quality concerns if any>"]
  },
  "actionable_insights": {
    "next_steps": ["<recommended next construction steps>"],
    "potential_delays": ["<possible delay factors observed>"],
    "recommendations": ["<overall recommendations for project managers>"]
  },
  "summary": "<2-3 sentence executive summary of what the photo shows and the construction progress>"
}`;

  try {
    console.log('🤖 Calling Claude Vision for construction analysis...');
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }
      ],
      system: systemPrompt
    });

    const aiText = response.content[0]?.text || '';
    console.log('✅ Claude Vision analysis received');

    // Parse JSON response
    let analysis;
    try {
      // Try to extract JSON from the response (handle if Claude wraps in markdown)
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
    } catch (parseErr) {
      console.warn('⚠️ Could not parse AI response as JSON, wrapping as text');
      analysis = {
        success: true,
        progress_assessment: {
          estimated_completion_percentage: null,
          confidence: 'low',
          stage: 'Analysis completed (unstructured)'
        },
        summary: aiText,
        raw_response: true
      };
    }

    // Ensure success flag
    analysis.success = true;
    analysis.ai_provider = 'claude-vision';
    analysis.analyzed_at = new Date().toISOString();

    // Extract the key percentage for backward compatibility
    const estimatedPercentage = analysis.progress_assessment?.estimated_completion_percentage || null;

    return {
      ...analysis,
      ai_suggestion: {
        milestone: taskName,
        ai_estimated_completion: estimatedPercentage,
        suggested_percentage: estimatedPercentage,
        confidence: analysis.progress_assessment?.confidence || 'medium',
        reason: analysis.summary || 'Claude Vision analysis'
      }
    };

  } catch (err) {
    console.error('❌ Claude Vision analysis failed:', err.message);
    return {
      success: false,
      error: true,
      message: `AI analysis failed: ${err.message}`,
      ai_provider: 'claude-vision',
      timestamp: new Date().toISOString(),
      ai_suggestion: {
        milestone: taskName || 'Task',
        confidence: 'low',
        reason: `AI analysis error: ${err.message}`
      }
    };
  }
};


// ============================================
// 2. AI CONSTRUCTION ADVISOR (Chat)
// ============================================

/**
 * AI Construction Advisor - answers project-related questions
 * Uses project data context to provide intelligent advice
 * Supports multi-turn conversation via conversationHistory
 */
export const getConstructionAdvice = async (question, projectData = {}, conversationHistory = []) => {
  const client = getClient();

  const systemPrompt = `You are BuildWise AI Advisor, an expert construction management consultant for New San Jose Builders Inc., a construction company in the Philippines.

Your role is to help project managers, site engineers, and executives make better decisions about their construction projects. You have access to the project data provided and should reference it when relevant.

Guidelines:
- Be specific and actionable in your advice
- Reference actual project data when available (budgets, timelines, progress)
- Consider Philippine construction standards and practices
- Flag potential risks and suggest mitigation strategies
- Keep responses concise but thorough (200-400 words)
- Use peso (₱) for currency
- If asked about something not related to construction or project management, politely redirect
- You remember the full conversation history and can reference earlier questions/answers`;

  const contextBlock = buildProjectContext(projectData);

  // Build messages array with conversation history for multi-turn context
  const messages = [];

  // If there's conversation history, include it (limit to last 20 messages to stay within token limits)
  if (conversationHistory && conversationHistory.length > 0) {
    // First message always includes the project context
    const recentHistory = conversationHistory.slice(-20);
    recentHistory.forEach((msg, idx) => {
      if (msg.role === 'user') {
        // Prepend project context to the first user message only
        const content = idx === 0 ? `${contextBlock}\n\nQuestion: ${msg.content}` : `Question: ${msg.content}`;
        messages.push({ role: 'user', content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    });
    // Add the new question
    messages.push({ role: 'user', content: `Question: ${question}` });
  } else {
    // Single question, no history
    messages.push({ role: 'user', content: `${contextBlock}\n\nQuestion: ${question}` });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: systemPrompt,
      messages
    });

    const reply = response.content[0]?.text || 'I apologize, I could not generate a response.';
    
    return {
      success: true,
      response: reply,
      timestamp: new Date().toISOString(),
      model: 'claude-3-haiku',
      tokens_used: response.usage?.output_tokens || 0
    };

  } catch (err) {
    console.error('❌ AI Advisor error:', err.message);
    return {
      success: false,
      error: err.message,
      response: 'I apologize, I am temporarily unable to process your request. Please try again.',
      timestamp: new Date().toISOString()
    };
  }
};


// ============================================
// 3. AI PROJECT RISK ANALYSIS
// ============================================

/**
 * Analyze project risks and predict potential issues
 */
export const analyzeProjectRisks = async (projectData) => {
  const client = getClient();

  const systemPrompt = `You are a construction project risk analyst. Analyze the provided project data and identify risks, predict potential issues, and suggest mitigation strategies. Respond in valid JSON format only.`;

  const contextBlock = buildProjectContext(projectData);

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${contextBlock}

Analyze this project's risks and respond in this JSON format:
{
  "risk_level": "<low|medium|high|critical>",
  "overall_health": "<on-track|at-risk|critical>",
  "budget_analysis": {
    "status": "<under-budget|on-budget|over-budget>",
    "burn_rate": "<description of spending rate>",
    "forecast": "<budget forecast>"
  },
  "schedule_analysis": {
    "status": "<ahead|on-schedule|behind|critical>",
    "estimated_delay_days": <number>,
    "critical_path_items": ["<items on critical path>"]
  },
  "risks": [
    {
      "category": "<budget|schedule|safety|quality|resource>",
      "severity": "<low|medium|high|critical>",
      "description": "<risk description>",
      "mitigation": "<suggested mitigation>"
    }
  ],
  "recommendations": ["<top priority recommendations>"],
  "summary": "<2-3 sentence executive risk summary>"
}`
        }
      ]
    });

    const aiText = response.content[0]?.text || '';
    
    let analysis;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
    } catch {
      analysis = { risk_level: 'unknown', summary: aiText, raw_response: true };
    }

    return {
      success: true,
      ...analysis,
      analyzed_at: new Date().toISOString()
    };

  } catch (err) {
    console.error('❌ Risk analysis failed:', err.message);
    return {
      success: false,
      error: err.message,
      risk_level: 'unknown',
      summary: 'Risk analysis temporarily unavailable'
    };
  }
};


// ============================================
// HELPER: Build project context string
// ============================================

function buildProjectContext(projectData) {
  if (!projectData || Object.keys(projectData).length === 0) {
    return 'No specific project data available. Provide general construction management advice.';
  }

  let context = '=== PROJECT DATA ===\n';
  context += `Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

  if (projectData.project) {
    const p = projectData.project;
    context += `Project Name: ${p.name || 'N/A'}\n`;
    context += `Location: ${p.location || 'N/A'}\n`;
    context += `Status: ${p.status || 'N/A'}\n`;
    context += `Contract Cost: ₱${(p.contractCost || 0).toLocaleString()}\n`;
    context += `Date Created: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}\n`;
    context += `Date Started: ${p.dateStarted ? new Date(p.dateStarted).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}\n`;
    context += `Target Completion: ${p.contractCompletionDate ? new Date(p.contractCompletionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}\n`;
    
    // Calculate timeline info
    if (p.dateStarted && p.contractCompletionDate) {
      const start = new Date(p.dateStarted);
      const end = new Date(p.contractCompletionDate);
      const now = new Date();
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      const timeElapsedPct = totalDays > 0 ? ((elapsedDays / totalDays) * 100).toFixed(1) : 0;
      
      context += `Total Project Duration: ${totalDays} days\n`;
      context += `Days Elapsed: ${elapsedDays} days (${timeElapsedPct}% of timeline)\n`;
      context += `Days Remaining: ${remainingDays} days${remainingDays < 0 ? ' ⚠️ OVERDUE' : ''}\n`;
    } else if (p.contractCompletionDate) {
      const end = new Date(p.contractCompletionDate);
      const now = new Date();
      const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      context += `Days Until Deadline: ${remainingDays} days${remainingDays < 0 ? ' ⚠️ OVERDUE' : ''}\n`;
    }
    
    context += `Contractor: ${p.contractor || 'N/A'}\n`;
    context += `Project Manager: ${p.projectManager || 'N/A'}\n`;
    if (p.constructionConsultant) context += `Construction Consultant: ${p.constructionConsultant}\n`;
    if (p.implementingOffice) context += `Implementing Office: ${p.implementingOffice}\n`;
    if (p.sourcesOfFund) context += `Sources of Fund: ${p.sourcesOfFund}\n`;
  }

  if (projectData.progress !== undefined) {
    context += `\nOverall Progress: ${projectData.progress}%\n`;
  }

  if (projectData.totalSpent !== undefined) {
    context += `Total Spent: ₱${projectData.totalSpent.toLocaleString()}\n`;
    if (projectData.project?.contractCost) {
      const budget = projectData.project.contractCost;
      const pct = ((projectData.totalSpent / budget) * 100).toFixed(1);
      context += `Budget Used: ${pct}%\n`;
      if (projectData.totalSpent > budget) {
        context += `⚠️ OVER BUDGET by ₱${(projectData.totalSpent - budget).toLocaleString()}\n`;
      }
    }
  }

  if (projectData.phases && projectData.phases.length > 0) {
    context += `\n--- PHASES ---\n`;
    projectData.phases.forEach(phase => {
      context += `Phase: ${phase.milestoneName || phase.name} — ${phase.completionPercentage || 0}% complete\n`;
    });
  }

  if (projectData.tasks && projectData.tasks.length > 0) {
    context += `\n--- TASKS (${projectData.tasks.length} total) ---\n`;
    const incomplete = projectData.tasks.filter(t => (t.completionPercentage || 0) < 100);
    const completed = projectData.tasks.filter(t => (t.completionPercentage || 0) >= 100);
    context += `Completed tasks: ${completed.length}\n`;
    context += `Incomplete tasks: ${incomplete.length}\n`;
    incomplete.slice(0, 10).forEach(task => {
      let taskLine = `- ${task.milestoneName || task.name}: ${task.completionPercentage || 0}%`;
      if (task.priority) taskLine += ` (${task.priority} priority)`;
      if (task.startDate) taskLine += ` | Start: ${new Date(task.startDate).toLocaleDateString()}`;
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        const now = new Date();
        const isOverdue = due < now;
        taskLine += ` | Due: ${due.toLocaleDateString()}${isOverdue ? ' ⚠️ OVERDUE' : ''}`;
      }
      context += taskLine + '\n';
    });
  }

  if (projectData.expenses && projectData.expenses.length > 0) {
    context += `\n--- EXPENSES (${projectData.expenses.length} entries) ---\n`;
    const byCategory = {};
    projectData.expenses.forEach(e => {
      const cat = e.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(e.amount) || 0);
    });
    Object.entries(byCategory).forEach(([cat, amount]) => {
      context += `${cat}: ₱${amount.toLocaleString()}\n`;
    });
  }

  if (projectData.recentPhotos && projectData.recentPhotos.length > 0) {
    context += `\n--- RECENT PHOTOS: ${projectData.recentPhotos.length} uploaded ---\n`;
  }

  context += '=== END PROJECT DATA ===';
  return context;
}


// ============================================
// 5. AI CHAT SESSION TITLE GENERATION
// ============================================

/**
 * Generate a short, descriptive title for a chat session
 * based on the first user question and AI response.
 * Returns a 3-7 word summary title (like ChatGPT/Claude do).
 */
export const generateChatTitle = async (userQuestion, aiResponse) => {
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 30,
      system: 'You generate very short chat conversation titles. Respond with ONLY the title text, nothing else. No quotes, no punctuation at the end, no prefixes.',
      messages: [
        {
          role: 'user',
          content: `Generate a concise 3-6 word title summarizing this conversation topic.

User asked: "${userQuestion.substring(0, 200)}"
AI replied about: "${aiResponse.substring(0, 200)}"

Title:`
        }
      ]
    });

    const title = response.content[0]?.text?.trim();
    // Validate: must be short and non-empty
    if (title && title.length > 0 && title.length <= 80) {
      return title;
    }
    return null;
  } catch (err) {
    console.error('⚠️ Title generation API error:', err.message);
    return null;
  }
};


export default {
  analyzeConstructionPhoto,
  getConstructionAdvice,
  analyzeProjectRisks,
  generateChatTitle
};
