import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

// AWS DynamoDB Client Setup
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * @desc Generate AI report for a project using Claude AI
 * @route POST /api/reports/generate/:projectId
 * @access Private (Requires Token)
 */
export const generateAIReport = async (req, res) => {
    const { projectId } = req.params;
    const { reportType } = req.body;
    
    console.log(`\n📊 Generating ${reportType} report for project ${projectId} using Claude AI...`);

    // Check API key before proceeding
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY not found in environment!');
        return res.status(500).json({ 
            message: 'AI service not configured. ANTHROPIC_API_KEY is missing.' 
        });
    }

    try {
        // 1. Fetch Project Details
        console.log('🔍 Step 1: Fetching project details...');
        let project;
        try {
            const projectParams = {
                TableName: 'buildwiseProjects',
                Key: { projectId }
            };
            const projectResult = await docClient.send(new GetCommand(projectParams));
            project = projectResult.Item;

            if (!project) {
                console.error('❌ Project not found:', projectId);
                return res.status(404).json({ message: 'Project not found' });
            }
            console.log('✅ Project found:', project.name);
        } catch (error) {
            console.error('❌ Error fetching project:', error.message);
            if (error.name === 'ResourceNotFoundException') {
                return res.status(500).json({ 
                    message: 'Database table "buildwiseProjects" does not exist. Please create the table first.' 
                });
            }
            return res.status(500).json({ message: 'Failed to fetch project', error: error.message });
        }

        // 2. Fetch Milestones/Tasks
        console.log('🔍 Step 2: Fetching milestones...');
        let milestones = [];
        try {
            const milestonesParams = {
                TableName: 'BuildWiseMilestones',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const milestonesResult = await docClient.send(new ScanCommand(milestonesParams));
            milestones = milestonesResult.Items || [];
            console.log(`✅ Found ${milestones.length} milestones`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWiseMilestones" does not exist - skipping milestones');
            } else {
                console.warn('⚠️ Could not fetch milestones:', error.name, '-', error.message);
            }
        }

        // 3. Fetch Progress Updates
        console.log('🔍 Step 3: Fetching progress updates...');
        let updates = [];
        try {
            const updatesParams = {
                TableName: 'BuildWiseProgressUpdates',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const updatesResult = await docClient.send(new ScanCommand(updatesParams));
            updates = updatesResult.Items || [];
            console.log(`✅ Found ${updates.length} progress updates`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWiseProgressUpdates" does not exist - skipping updates');
            } else {
                console.warn('⚠️ Could not fetch progress updates:', error.name, '-', error.message);
            }
        }

        // 4. Fetch Photos
        console.log('🔍 Step 4: Fetching photos...');
        let photos = [];
        try {
            const photosParams = {
                TableName: 'BuildWisePhotos',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const photosResult = await docClient.send(new ScanCommand(photosParams));
            photos = photosResult.Items || [];
            console.log(`✅ Found ${photos.length} photos (${photos.filter(p => p.aiProcessed).length} AI-analyzed)`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWisePhotos" does not exist - skipping photos');
            } else {
                console.warn('⚠️ Could not fetch photos:', error.name, '-', error.message);
            }
        }

        // 5. Fetch Expenses
        console.log('🔍 Step 5: Fetching expenses...');
        let expenses = [];
        try {
            const expensesParams = {
                TableName: 'BuildWiseExpenses',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const expensesResult = await docClient.send(new ScanCommand(expensesParams));
            expenses = expensesResult.Items || [];
            const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            console.log(`✅ Found ${expenses.length} expenses (Total: ₱${totalExpenses.toLocaleString()})`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWiseExpenses" does not exist - skipping expenses');
            } else {
                console.warn('⚠️ Could not fetch expenses:', error.name, '-', error.message);
            }
        }

        // 6. Fetch Comments
        console.log('🔍 Step 6: Fetching comments...');
        let comments = [];
        try {
            const commentsParams = {
                TableName: 'BuildWiseComments',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const commentsResult = await docClient.send(new ScanCommand(commentsParams));
            comments = commentsResult.Items || [];
            console.log(`✅ Found ${comments.length} comments`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWiseComments" does not exist - skipping comments');
            } else {
                console.warn('⚠️ Could not fetch comments:', error.name, '-', error.message);
            }
        }

        // 7. Fetch Documents
        console.log('🔍 Step 7: Fetching documents...');
        let documents = [];
        try {
            const documentsParams = {
                TableName: 'BuildWiseDocuments',
                FilterExpression: 'projectId = :projectId',
                ExpressionAttributeValues: { ':projectId': projectId }
            };
            const documentsResult = await docClient.send(new ScanCommand(documentsParams));
            documents = documentsResult.Items || [];
            console.log(`✅ Found ${documents.length} documents`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn('⚠️ Table "BuildWiseDocuments" does not exist - skipping documents');
            } else {
                console.warn('⚠️ Could not fetch documents:', error.name, '-', error.message);
            }
        }

        // 8. Prepare AI Context with ALL data
        console.log('🔍 Step 8: Preparing AI context...');
        const aiContext = prepareAIContext(project, milestones, updates, photos, expenses, comments, documents, reportType);

        // 9. Generate Report with Claude AI
        console.log('🤖 Step 9: Calling Claude AI for report generation...');
        console.log('🔑 API Key length:', process.env.ANTHROPIC_API_KEY?.length || 0);
        
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            temperature: 0.7,
            system: `You are a professional construction site supervisor writing Daily Accomplishment Reports in a structured format with clear sections. Format the report with the following structure:

SECTION 1: Summary of Accomplishments (2-3 sentences highlighting key achievements)
SECTION 2: Detailed Accomplishments (Create a table with columns: Task/Activity | Details/Description | Impact/Outcome | Time Spent)
SECTION 3: Pending/Follow-up Tasks (Create a table with columns: Task/Activity | Reason for Pending | Action Plan | Expected Completion)
SECTION 4: Reflections and Suggestions (Include personal reflections on the day's accomplishments and suggestions for improvement)

Use clear headers with ---SECTION 1---, ---SECTION 2---, etc. Format tables using pipe characters (|) for columns. Keep professional tone throughout.`,
            messages: [{
                role: "user",
                content: aiContext
            }]
        });

        console.log('✅ Claude AI responded successfully');

        // 10. Clean up AI generated text - IMPROVED CLEANING
        console.log('🔍 Step 10: Cleaning generated text...');
        let generatedReport = message.content[0].text;
        
        // Remove gibberish patterns more aggressively
        generatedReport = generatedReport
            .replace(/&[a-zA-Z0-9#;]+/g, '')           // Remove HTML entities and gibberish
            .replace(/[&×÷±§¶•‡†]/g, '')               // Remove special symbols
            .replace(/([a-zA-Z]&)+/g, '')              // Remove patterns like "a&b&c&"
            .replace(/(&[^&\s]{1,6})+/g, '')           // Remove short ampersand patterns
            .replace(/\s{2,}/g, ' ')                   // Remove multiple spaces
            .replace(/^\s+|\s+$/gm, '')                // Trim lines
            .trim();

        // 11. Save Report to DynamoDB
        console.log('🔍 Step 11: Saving report to database...');
        const reportId = uuidv4();
        const reportParams = {
            TableName: 'BuildWiseReports',
            Item: {
                reportId,
                projectId,
                projectName: project.name,
                reportType,
                generatedText: generatedReport,
                dataSnapshot: {
                    totalMilestones: milestones.length,
                    completedMilestones: milestones.filter(m => m.status === 'completed').length,
                    inProgressMilestones: milestones.filter(m => m.status === 'in progress').length,
                    totalUpdates: updates.length,
                    totalPhotos: photos.length,
                    aiProcessedPhotos: photos.filter(p => p.aiProcessed).length,
                    totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
                    expenseCount: expenses.length,
                    totalComments: comments.length,
                    totalDocuments: documents.length
                },
                aiModel: "claude-3-haiku-20240307",
                generatedBy: req.user?.userId || 'system',
                createdAt: new Date().toISOString()
            }
        };

        await docClient.send(new PutCommand(reportParams));
        console.log('✅ Report saved with ID:', reportId);
        console.log('✅ Report generation completed successfully!\n');

        res.status(201).json({
            message: 'Report generated successfully',
            report: reportParams.Item
        });
    } catch (error) {
        console.error('❌ Error generating report:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            message: 'Failed to generate report',
            error: error.message,
            errorType: error.name
        });
    }
};

/**
 * Prepare AI context with project data - FIXED TO PREVENT UNDEFINED TEXT
 */
const prepareAIContext = (project, milestones, updates, photos, expenses, comments, documents, reportType) => {
    const completedTasks = milestones.filter(m => m.status === 'completed').length;
    const totalTasks = milestones.length;
    const totalBudget = project.contractCost || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Get actual milestone data - FIXED: Filter out items without names
    const completedList = milestones
        .filter(m => m.status === 'completed' && m.name && m.name.trim())
        .map(m => ({
            name: m.name.trim(),
            description: (m.description || '').trim() || 'Task completed successfully'
        }));
    
    const inProgressList = milestones
        .filter(m => m.status === 'in progress' && m.name && m.name.trim())
        .map(m => ({
            name: m.name.trim(),
            description: (m.description || '').trim() || 'Work in progress',
            progress: m.progress || 0
        }));
    
    // Format completed accomplishments - FIXED: Better formatting
    const completedItems = completedList.length > 0 
        ? completedList.map(m => `${m.name}: ${m.description}`).join('\n')
        : 'No completed tasks recorded for this period';
    
    // Format performance metrics - FIXED: Better formatting
    const inProgressItems = inProgressList.length > 0
        ? inProgressList.map(m => `${m.name} (${m.progress}% complete): ${m.description}`).join('\n')
        : 'No tasks currently in progress';
    
    // Format expenses as impact - FIXED: Filter out invalid expenses
    const validExpenses = expenses.filter(e => e.description && e.description.trim() && e.amount);
    const expensesSummary = validExpenses.length > 0 
        ? validExpenses.map(e => `${e.description.trim()}: ₱${(e.amount || 0).toLocaleString()}`).join('\n')
        : 'No expenses recorded for this period';

    const totalExpensesFormatted = validExpenses.length > 0 ? `₱${totalSpent.toLocaleString()}` : '₱0';
    
    // Calculate progress percentage
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return `You are a professional construction company writing an ACCOMPLISHMENT REPORT FOR EMPLOYEE/TEAM for ${project.name}.

DO NOT add any information that is not in the provided data. Use ONLY the facts provided below. Do not invent metrics, timelines, or outcomes.

Generate the report in this EXACT format:

---HEADER---
Accomplishment Report For Construction Team
${project.name} – ${project.location || 'Project Location'} Construction Project

---EMPLOYEE_INFO---
Project Name: ${project.name}
Location: ${project.location || 'Not specified'}
Department: Construction Management
Reporting Period: [Report Period] | Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

---INTRODUCTION---
This report documents the significant accomplishments and contributions of the construction team to ${project.name} during the specified reporting period. It aims to recognize the efforts and achievements that have positively impacted the project's progress and financial performance.

---KEY_ACCOMPLISHMENTS---
Project Successes:
${completedItems}

Performance Metrics:
- Overall Project Progress: ${overallProgress}% complete
- Total Milestones Completed: ${completedTasks} out of ${totalTasks}
- Construction Tasks In Progress: ${inProgressList.length}
- Active Updates/Documentation: ${updates.length} records
- Photo Documentation: ${photos.length} images recorded

---FINANCIAL_IMPACT---
Cost Management and Budget Performance:
- Total Project Budget: ₱${totalBudget.toLocaleString()}
- Total Expenses Recorded: ${totalExpensesFormatted}
- Expense Breakdown:
${expensesSummary}

---IN_PROGRESS_TASKS---
Current Construction Activities:
${inProgressItems}

---SKILLS_AND_LEARNING---
Team Development and Project Knowledge:
- Documentation provided through ${documents.length} construction documents
- Team collaboration tracked through ${comments.length} project discussions
- Site documentation through ${photos.length} photos for quality assurance

---FOOTER---
Copyright © ${new Date().getFullYear()} BuildWise Construction Management | All Rights Reserved

FORMAT INSTRUCTIONS:
- Use the exact section headers with --- delimiters
- Fill in all bracketed information with actual data
- Do NOT add information beyond what is provided
- Keep accomplishments factual and data-driven
- Use actual project names, locations, and metrics from the data
- Present numbers and figures exactly as they are in the data
- Do not estimate or assume any values
- Do NOT use ampersands (&) or special characters in your output
- Write in plain text without encoding

Generate the complete report now using ONLY the provided data.`;
};

/**
 * @desc Get all reports for a specific project
 * @route GET /api/reports/project/:projectId
 * @access Private
 */
export const getReportsForProject = async (req, res) => {
    const { projectId } = req.params;
    
    console.log(`📋 Fetching reports for project: ${projectId}`);
    
    try {
        const params = {
            TableName: 'BuildWiseReports',
            FilterExpression: 'projectId = :projectId',
            ExpressionAttributeValues: { ':projectId': projectId }
        };
        
        const result = await docClient.send(new ScanCommand(params));
        const reports = (result.Items || []).sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        console.log(`✅ Found ${reports.length} reports for project`);
        res.status(200).json(reports);
    } catch (error) {
        console.error('❌ Error fetching reports:', error);
        
        if (error.name === 'ResourceNotFoundException') {
            return res.status(500).json({ 
                message: 'Reports table does not exist. Please create BuildWiseReports table first.',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to fetch reports', 
            error: error.message 
        });
    }
};

/**
 * @desc Get a single report by ID
 * @route GET /api/reports/:reportId
 * @access Private
 */
export const getReportById = async (req, res) => {
    const { reportId } = req.params;
    
    console.log(`📋 Fetching report: ${reportId}`);
    
    try {
        const params = {
            TableName: 'BuildWiseReports',
            Key: { reportId }
        };
        
        const result = await docClient.send(new GetCommand(params));
        
        if (!result.Item) {
            console.warn('⚠️ Report not found:', reportId);
            return res.status(404).json({ message: 'Report not found' });
        }
        
        console.log('✅ Report found:', result.Item.reportType);
        res.status(200).json(result.Item);
    } catch (error) {
        console.error('❌ Error fetching report:', error);
        
        if (error.name === 'ResourceNotFoundException') {
            return res.status(500).json({ 
                message: 'Reports table does not exist.',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to fetch report', 
            error: error.message 
        });
    }
};

/**
 * @desc Delete a report
 * @route DELETE /api/reports/:reportId
 * @access Private
 */
export const deleteReport = async (req, res) => {
    const { reportId } = req.params;
    
    console.log(`🗑️ Deleting report: ${reportId}`);
    
    try {
        // First check if report exists
        const getParams = {
            TableName: 'BuildWiseReports',
            Key: { reportId }
        };
        
        const existingReport = await docClient.send(new GetCommand(getParams));
        
        if (!existingReport.Item) {
            console.warn('⚠️ Report not found:', reportId);
            return res.status(404).json({ message: 'Report not found' });
        }
        
        // Delete the report
        const deleteParams = {
            TableName: 'BuildWiseReports',
            Key: { reportId }
        };
        
        await docClient.send(new DeleteCommand(deleteParams));
        
        console.log('✅ Report deleted successfully');
        res.status(200).json({ 
            message: 'Report deleted successfully',
            deletedReportId: reportId 
        });
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        
        if (error.name === 'ResourceNotFoundException') {
            return res.status(500).json({ 
                message: 'Reports table does not exist.',
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to delete report', 
            error: error.message 
        });
    }
};